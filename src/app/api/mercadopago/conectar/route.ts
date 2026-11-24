import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const REDIRECT_URI =
  process.env.MERCADOPAGO_REDIRECT_URI ??
  "https://nubecitaweb.vercel.app/auth/mercadopago/callback";

export async function GET() {
  try {
    // Verificar que el usuario tenga una sesión activa.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Debés iniciar sesión para conectar Mercado Pago." },
        { status: 401 }
      );
    }

    // Solo las modelos pueden conectar una cuenta.
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilError) {
      return NextResponse.json(
        { error: "No se pudo verificar el perfil." },
        { status: 500 }
      );
    }

    if (perfil?.role !== "modelo") {
      return NextResponse.json(
        { error: "Solo las modelos pueden conectar Mercado Pago." },
        { status: 403 }
      );
    }

    const clientId = process.env.MERCADOPAGO_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "Falta configurar Mercado Pago." },
        { status: 500 }
      );
    }

    // Generar los valores de seguridad PKCE.
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");

    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    // Construir la URL oficial de autorización.
    const authorizationUrl = new URL(
      "https://auth.mercadopago.com/authorization"
    );

    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set(
      "code_challenge_method",
      "S256"
    );

    const respuesta = NextResponse.redirect(authorizationUrl);

    const opcionesCookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/auth/mercadopago/callback",
      maxAge: 600,
    };

    // Guardar los datos para validarlos al regresar de Mercado Pago.
    respuesta.cookies.set("mp_oauth_state", state, opcionesCookie);
    respuesta.cookies.set("mp_oauth_verifier", verifier, opcionesCookie);
    respuesta.cookies.set("mp_oauth_user", user.id, opcionesCookie);

    return respuesta;
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar la conexión con Mercado Pago." },
      { status: 500 }
    );
  }
}