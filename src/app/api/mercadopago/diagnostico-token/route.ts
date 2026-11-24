
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { descifrarToken } from "@/lib/mercadopago/crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Comprobar que haya una sesión iniciada.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Debés iniciar sesión." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // 2. Comprobar que sea una cuenta modelo.
    const { data: perfil, error: perfilError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilError || !perfil || perfil.role !== "modelo") {
      return NextResponse.json(
        { error: "Esta cuenta no está habilitada para el diagnóstico." },
        { status: 403 }
      );
    }

    // 3. Recuperar la conexión sin modificarla.
    const { data: conexion, error: conexionError } = await admin
      .from("mercadopago_conexiones")
      .select(
        "mp_user_id, access_token_encrypted, estado, entorno"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (conexionError || !conexion) {
      return NextResponse.json(
        { error: "No se encontró la conexión de Mercado Pago." },
        { status: 404 }
      );
    }

    if (
      conexion.estado !== "connected" ||
      conexion.entorno !== "pruebas"
    ) {
      return NextResponse.json(
        {
          error: "La conexión no está activa en ambiente de pruebas.",
          estado: conexion.estado,
          entorno: conexion.entorno,
        },
        { status: 409 }
      );
    }

    // 4. Descifrar el token existente.
    const accessToken = descifrarToken(
      conexion.access_token_encrypted
    );

    // 5. Consultar la identidad directamente a Mercado Pago.
    const respuesta = await fetch(
      "https://api.mercadolibre.com/users/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!respuesta.ok) {
      return NextResponse.json(
        {
          tokenValido: false,
          coincide: false,
          httpMercadoPago: respuesta.status,
          mensaje:
            "Mercado Pago no pudo validar el Access Token actual.",
        },
        { status: 502 }
      );
    }

    const datos = await respuesta.json();

    const mpUserIdActual = String(datos.id);
    const mpUserIdGuardado = String(conexion.mp_user_id);

    // 6. Comparar la identidad obtenida con Supabase.
    return NextResponse.json({
      tokenValido: true,
      coincide: mpUserIdActual === mpUserIdGuardado,
      mpUserIdGuardado,
      mpUserIdMercadoPago: mpUserIdActual,
      entorno: conexion.entorno,
      mensaje:
        mpUserIdActual === mpUserIdGuardado
          ? "El token es válido y pertenece a la cuenta conectada."
          : "El token es válido, pero pertenece a otra cuenta de Mercado Pago.",
    });
  } catch (error) {
    console.error(
      "[Diagnóstico MP] Error:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return NextResponse.json(
      { error: "No se pudo completar el diagnóstico." },
      { status: 500 }
    );
  }
}
