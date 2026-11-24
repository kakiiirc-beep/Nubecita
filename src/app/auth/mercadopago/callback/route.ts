
import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cifrarToken } from "@/lib/mercadopago/crypto";

export const runtime = "nodejs";

const REDIRECT_URI =
  process.env.MERCADOPAGO_REDIRECT_URI ??
  "https://nubecitaweb.vercel.app/auth/mercadopago/callback";

const COOKIE_PATH = "/auth/mercadopago/callback";

function limpiarCookies(response: NextResponse) {
  for (const name of [
    "mp_oauth_state",
    "mp_oauth_verifier",
    "mp_oauth_user",
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: COOKIE_PATH,
      maxAge: 0,
    });
  }

  return response;
}

function errorResponse(message: string, status = 400) {
  return limpiarCookies(
    NextResponse.json({ error: message }, { status })
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const mpError = url.searchParams.get("error");

    if (mpError) {
      return errorResponse(
        "La autorización de Mercado Pago no fue completada."
      );
    }

    const stateCookie = request.cookies.get("mp_oauth_state")?.value;
    const verifier = request.cookies.get("mp_oauth_verifier")?.value;
    const userCookie = request.cookies.get("mp_oauth_user")?.value;
console.log("[Mercado Pago] Validación de cookies:", {
  tieneCode: Boolean(code),
  tieneState: Boolean(state),
  tieneStateCookie: Boolean(stateCookie),
  tieneVerifier: Boolean(verifier),
  tieneUserCookie: Boolean(userCookie),
  stateCoincide: Boolean(state && stateCookie && state === stateCookie),
});
    if (
      !code ||
      !state ||
      !stateCookie ||
      !verifier ||
      !userCookie ||
      state !== stateCookie
    ) {
      return errorResponse(
        "La autorización no pudo validarse. Intentá nuevamente."
      );
    }

    // Verificar que siga conectado el mismo usuario de Supabase.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userCookie) {
      return errorResponse(
        "La sesión cambió o expiró. Volvé a iniciar sesión."
      );
    }

    // Verificar que el usuario siga siendo una modelo.
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilError || perfil?.role !== "modelo") {
      return errorResponse(
        "No se pudo verificar el perfil de modelo.",
        403
      );
    }

    // Validar las credenciales del servidor.
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        "Falta configurar una credencial del servidor.",
        500
      );
    }

    // Intercambiar el código de autorización por los tokens.
    const tokenResponse = await fetch(
      "https://api.mercadopago.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier,
          test_token: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!tokenResponse.ok) {
      return errorResponse(
        "Mercado Pago no pudo completar el intercambio de autorización.",
        502
      );
    }

    const tokens: {
      access_token?: string;
      refresh_token?: string;
      user_id?: number | string;
      expires_in?: number;
      scope?: string;
    } = await tokenResponse.json();

    if (
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.user_id ||
      typeof tokens.expires_in !== "number" ||
      !Number.isSafeInteger(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      !tokens.scope?.split(/\s+/).includes("offline_access")
    ) {
      return errorResponse(
        "Mercado Pago devolvió una respuesta incompleta.",
        502
      );
    }

    // Crear un cliente administrativo exclusivamente del lado servidor.
    const admin = createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Crear una conexión nueva sin sobrescribir conexiones existentes.
    const { error: guardarError } = await admin
      .from("mercadopago_conexiones")
      .insert({
        user_id: user.id,
        mp_user_id: String(tokens.user_id),
        access_token_encrypted: cifrarToken(tokens.access_token),
        refresh_token_encrypted: cifrarToken(tokens.refresh_token),
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        scope: tokens.scope,
        estado: "connected",
        entorno: "pruebas",
        refresh_lock_token: null,
        refresh_lock_until: null,
        updated_at: new Date().toISOString(),
      });

    if (guardarError) {
      if (guardarError.code === "23505") {
        return errorResponse(
          "Esta cuenta de Mercado Pago ya está conectada o tu modelo ya tiene una cuenta vinculada.",
          409
        );
      }

      console.error(
        "[Mercado Pago] Error al guardar la conexión:",
        guardarError.message
      );

      return errorResponse(
        "No se pudo guardar la conexión de Mercado Pago.",
        500
      );
    }

    const destino = perfil.username
      ? `/perfil/${encodeURIComponent(perfil.username)}?mercadopago=conectado`
      : "/?mercadopago=conectado";

    return limpiarCookies(
      NextResponse.redirect(new URL(destino, request.url))
    );
  } catch (error) {
    console.error("[Mercado Pago] Error en callback:", error);

    return errorResponse(
      "Ocurrió un error al conectar Mercado Pago.",
      500
    );
  }
}
