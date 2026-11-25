
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import MercadoPagoConfig, { Preference } from "mercadopago";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerAccessTokenMercadoPago } from "@/lib/mercadopago/renovar-token";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    // 1. Comprobar que el visitante haya iniciado sesión.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Debés iniciar sesión para donar.", 401);
    }

    // 2. Obtener el ID de la modelo.
    let body: { modeloId?: string };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Solicitud no válida.", 400);
    }

    const modeloId = body.modeloId;

    if (!modeloId || typeof modeloId !== "string") {
      return errorResponse("Modelo no válida.", 400);
    }

    if (modeloId === user.id) {
      return errorResponse("No podés donarte a vos misma.", 403);
    }

    const admin = createAdminClient();

    // 3. Comprobar que el perfil corresponda a una modelo.
    const { data: modelo, error: modeloError } = await admin
      .from("profiles")
      .select("id, username, role")
      .eq("id", modeloId)
      .maybeSingle();

    if (modeloError || !modelo || modelo.role !== "modelo") {
      return errorResponse("Modelo no encontrada.", 404);
    }

    // 4. Comprobar que tenga Mercado Pago conectado en Sandbox.
    const { data: conexion, error: conexionError } = await admin
      .from("mercadopago_conexiones")
      .select("estado, entorno")
      .eq("user_id", modeloId)
      .maybeSingle();

    if (
      conexionError ||
      !conexion ||
      conexion.estado !== "connected" ||
      conexion.entorno !== "pruebas"
    ) {
      return errorResponse(
        "La modelo no tiene Mercado Pago de pruebas conectado.",
        409
      );
    }

    // 5. Obtener el token OAuth de la modelo.
    const accessToken =
      await obtenerAccessTokenMercadoPago(modeloId);

    if (!accessToken) {
      return errorResponse(
        "No se pudo obtener la conexión de Mercado Pago.",
        409
      );
    }

    // 6. Validar la URL de NUBECITA.
    const baseUrl = process.env.NUBECITA_URL;

    if (!baseUrl) {
      return errorResponse("Falta configurar la URL de NUBECITA.", 500);
    }

    let origin: string;

    try {
      const parsedUrl = new URL(baseUrl);

      if (parsedUrl.protocol !== "https:") {
        return errorResponse("La URL debe utilizar HTTPS.", 500);
      }

      origin = parsedUrl.origin;
    } catch {
      return errorResponse("La URL de NUBECITA no es válida.", 500);
    }

    const perfilUrl =
      `${origin}/perfil/${encodeURIComponent(modelo.username)}`;

    // 7. Crear una preferencia independiente de los planes.
    const preferenceClient = new Preference(
      new MercadoPagoConfig({ accessToken })
    );

    const referencia = `donacion-${randomUUID()}`;

    const preferencia = await preferenceClient.create({
      body: {
        items: [
          {
            id: "donacion-prueba-nubecita",
            title: "Donación a una modelo de NUBECITA",
            description: "Donación de prueba en Sandbox",
            quantity: 1,
            currency_id: "ARS",
            unit_price: 1000,
          },
        ],
        external_reference: referencia,
        marketplace_fee: 150,
        back_urls: {
          success: perfilUrl,
          pending: perfilUrl,
          failure: perfilUrl,
        },
        auto_return: "approved",
      },
      requestOptions: {
        idempotencyKey: referencia,
      },
    });

    console.log("DONACIÓN: preferencia creada:", {
      preferenceId: preferencia.id,
      collectorId: preferencia.collector_id,
      marketplaceFee: preferencia.marketplace_fee,
    });

    // 8. Devolver exclusivamente el enlace Sandbox.
    if (!preferencia.sandbox_init_point) {
      return errorResponse(
        "Mercado Pago no devolvió un enlace de prueba.",
        502
      );
    }

    return NextResponse.json({
      checkoutUrl: preferencia.sandbox_init_point,
    });
  } catch (error) {
    console.error("Error al crear donación:", error);

    return errorResponse(
      "No se pudo iniciar la donación.",
      500
    );
  }
}
