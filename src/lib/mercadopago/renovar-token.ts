
import "server-only";

import { randomUUID } from "node:crypto";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cifrarToken, descifrarToken } from "@/lib/mercadopago/crypto";

const MARGEN_RENOVACION_MS = 5 * 60 * 1000;
const DURACION_BLOQUEO_SEGUNDOS = 300;

interface RespuestaMercadoPago {
  access_token?: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number;
  scope?: string;
  error?: string;
  message?: string;
}

export async function obtenerAccessTokenMercadoPago(
  userId: string
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
    throw new Error("Falta configurar Mercado Pago o Supabase.");
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: conexion, error: conexionError } = await admin
    .from("mercadopago_conexiones")
    .select(
      "user_id, mp_user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope, estado"
    )
    .eq("user_id", userId)
    .eq("estado", "connected")
    .maybeSingle();

  if (conexionError || !conexion) {
    throw new Error("No se encontró una conexión activa de Mercado Pago.");
  }

  if (
    conexion.token_expires_at &&
    new Date(conexion.token_expires_at).getTime() >
      Date.now() + MARGEN_RENOVACION_MS
  ) {
    return descifrarToken(conexion.access_token_encrypted);
  }

  const lockToken = randomUUID();

  const { data: bloqueado, error: bloqueoError } = await admin.rpc(
    "adquirir_bloqueo_mp",
    {
      p_user_id: userId,
      p_lock_token: lockToken,
      p_duracion_segundos: DURACION_BLOQUEO_SEGUNDOS,
    }
  );

  if (bloqueoError || bloqueado !== true) {
    throw new Error(
      "La conexión está siendo renovada. Intentá nuevamente en unos segundos."
    );
  }

  try {
    const { data: conexionActual, error: consultaError } = await admin
      .from("mercadopago_conexiones")
      .select(
        "mp_user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope, estado"
      )
      .eq("user_id", userId)
      .eq("estado", "connected")
      .maybeSingle();

    if (consultaError || !conexionActual) {
      throw new Error("No se pudo recuperar la conexión de Mercado Pago.");
    }

    if (
      conexionActual.token_expires_at &&
      new Date(conexionActual.token_expires_at).getTime() >
        Date.now() + MARGEN_RENOVACION_MS
    ) {
      return descifrarToken(conexionActual.access_token_encrypted);
    }

    const refreshToken = descifrarToken(
      conexionActual.refresh_token_encrypted
    );

    const respuesta = await fetch(
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
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!respuesta.ok) {
      const errorMP: RespuestaMercadoPago = await respuesta
        .json()
        .catch(() => ({}));

      const codigoError = errorMP.error ?? "unknown";

      throw new Error(
        `No se pudo renovar el token de Mercado Pago. HTTP ${respuesta.status}. Código: ${codigoError}.`
      );
    }

    const tokens: RespuestaMercadoPago = await respuesta.json();

    if (
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.user_id ||
      typeof tokens.expires_in !== "number" ||
      !Number.isSafeInteger(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      String(tokens.user_id) !== conexionActual.mp_user_id ||
      !tokens.scope?.split(/\s+/).includes("offline_access")
    ) {
      throw new Error("Mercado Pago devolvió datos de renovación incompletos.");
    }

    const { data: guardado, error: guardarError } = await admin
      .from("mercadopago_conexiones")
      .update({
        access_token_encrypted: cifrarToken(tokens.access_token),
        refresh_token_encrypted: cifrarToken(tokens.refresh_token),
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
        refresh_lock_token: null,
        refresh_lock_until: null,
      })
      .eq("user_id", userId)
      .eq("refresh_lock_token", lockToken)
      .eq("estado", "connected")
      .select("user_id")
      .maybeSingle();

    if (guardarError || !guardado) {
      throw new Error("No se pudieron guardar los nuevos tokens.");
    }

    return tokens.access_token;
  } finally {
    const { error: liberarError } = await admin.rpc(
      "liberar_bloqueo_mp",
      {
        p_user_id: userId,
        p_lock_token: lockToken,
      }
    );

    if (liberarError) {
      console.error(
        "[Mercado Pago] No se pudo liberar el bloqueo de renovación.",
        liberarError.message
      );
    }
  }
}
