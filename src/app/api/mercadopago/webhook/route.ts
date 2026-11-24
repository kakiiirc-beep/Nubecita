
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerAccessTokenMercadoPago } from "@/lib/mercadopago/renovar-token";

export const runtime = "nodejs";

type NotificationBody = {
  type?: unknown;
  live_mode?: unknown;
  user_id?: unknown;
  data?: {
    id?: unknown;
  };
};

type PaymentResponse = {
  id?: number | string;
  status?: string;
  live_mode?: boolean;
  collector_id?: number | string;
  external_reference?: string;
  transaction_amount?: number | string;
  currency_id?: string;
};

function response(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function validarFirma(
  firma: string | null,
  requestId: string | null,
  dataId: string | null,
  secret: string
): boolean {
  if (!firma || !requestId || !dataId) {
    return false;
  }

  const partes = firma.split(",");
  let timestamp: string | undefined;
  let hash: string | undefined;

  for (const parte of partes) {
    const [clave, valor] = parte.split("=", 2);

    if (!clave || !valor) {
      continue;
    }

    if (clave.trim() === "ts") {
      timestamp = valor.trim();
    }

    if (clave.trim() === "v1") {
      hash = valor.trim();
    }
  }

  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !hash ||
    !/^[a-fA-F0-9]{64}$/.test(hash)
  ) {
    return false;
  }

  const manifest =
    `id:${dataId.toLowerCase()};` +
    `request-id:${requestId};` +
    `ts:${timestamp};`;

  const hashCalculado = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const hashEsperado = Buffer.from(hashCalculado, "hex");
  const hashRecibido = Buffer.from(hash, "hex");

  if (hashEsperado.length !== hashRecibido.length) {
    return false;
  }

  return timingSafeEqual(hashEsperado, hashRecibido);
}

export async function POST(request: Request) {
  try {
    // 1. Comprobar que exista la clave secreta.
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!secret) {
      console.error("Falta configurar la clave secreta del webhook.");
      return response("Configuración incompleta.", 500);
    }

    // 2. Obtener los datos de la notificación.
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id");

    const firma = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");

    let body: NotificationBody;

    try {
      body = await request.json();
    } catch {
      return response("Notificación no válida.", 400);
    }

    // 3. Validar la firma de Mercado Pago.
    if (!validarFirma(firma, requestId, dataId, secret)) {
      return response("Firma no válida.", 401);
    }

    // 4. Procesar únicamente eventos de pagos.
    if (body.type !== "payment") {
      return response("Notificación recibida.", 200);
    }

    // 5. Aceptar exclusivamente notificaciones de pruebas.
    if (body.live_mode !== false) {
      return response("Notificación fuera del entorno de pruebas.", 200);
    }

    const paymentId = String(body.data?.id ?? "");
    const mpUserId = String(body.user_id ?? "");

    if (
      !paymentId ||
      !/^\d+$/.test(paymentId) ||
      paymentId !== dataId ||
      !/^\d+$/.test(mpUserId)
    ) {
      return response("Datos de notificación no válidos.", 400);
    }

    const admin = createAdminClient();

    // 6. Identificar la conexión Sandbox de la modelo.
    const { data: conexion, error: conexionError } = await admin
      .from("mercadopago_conexiones")
      .select("user_id, mp_user_id, estado, entorno")
      .eq("mp_user_id", mpUserId)
      .eq("estado", "connected")
      .eq("entorno", "pruebas")
      .maybeSingle();

    if (conexionError) {
      console.error(
        "Error al buscar la conexión del vendedor:",
        conexionError.message
      );
      return response("No se pudo verificar la conexión.", 500);
    }

    if (!conexion) {
      return response("Conexión de vendedor no encontrada.", 404);
    }

    // 7. Obtener el token de la modelo.
    const accessToken = await obtenerAccessTokenMercadoPago(
      conexion.user_id
    );

    // 8. Consultar directamente el pago en Mercado Pago.
    const respuestaMP = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
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

    if (!respuestaMP.ok) {
      console.error(
        "Mercado Pago no permitió consultar el pago. HTTP:",
        respuestaMP.status
      );
      return response("No se pudo verificar el pago.", 502);
    }

    const pago: PaymentResponse = await respuestaMP.json();

    // 9. Verificar los datos reales del pago.
    if (
      String(pago.id) !== paymentId ||
      String(pago.collector_id) !== mpUserId ||
      pago.live_mode !== false ||
      !pago.external_reference
    ) {
      return response("Los datos del pago no coinciden.", 400);
    }

    // 10. Buscar la compra correspondiente.
    const compraId = pago.external_reference;

    const { data: compra, error: compraError } = await admin
      .from("compras_planes")
      .select(
        "id, vendedor_id, importe, moneda, estado, mercadopago_payment_id"
      )
      .eq("id", compraId)
      .eq("vendedor_id", conexion.user_id)
      .maybeSingle();

    if (compraError) {
      console.error(
        "Error al consultar la compra:",
        compraError.message
      );
      return response("No se pudo consultar la compra.", 500);
    }

    if (!compra) {
      return response("Compra no encontrada.", 404);
    }

    // 11. Comprobar importe y moneda.
    const importePago = Math.round(
      Number(pago.transaction_amount) * 100
    );

    const importeCompra = Math.round(
      Number(compra.importe) * 100
    );

    if (
      !Number.isFinite(importePago) ||
      importePago <= 0 ||
      importePago !== importeCompra ||
      compra.moneda !== "ARS" ||
      pago.currency_id !== "ARS"
    ) {
      return response("El importe o la moneda no coinciden.", 400);
    }

    // 12. No aprobar pagos que Mercado Pago no haya aprobado.
    if (pago.status !== "approved") {
      return response("El pago todavía no está aprobado.", 200);
    }

    // 13. Si ya fue procesado, aceptar la notificación repetida.
    if (compra.estado === "aprobado") {
      if (compra.mercadopago_payment_id === paymentId) {
        return response("Pago ya procesado.", 200);
      }

      return response(
        "La compra ya tiene otro pago registrado.",
        409
      );
    }

    if (compra.estado !== "pendiente") {
      return response("La compra no está pendiente.", 409);
    }

    // 14. Aprobar la compra.
    // El trigger de Supabase establecerá aprobado_at y vence_at.
    const { data: actualizada, error: actualizarError } = await admin
      .from("compras_planes")
      .update({
        estado: "aprobado",
        mercadopago_payment_id: paymentId,
      })
      .eq("id", compra.id)
      .eq("estado", "pendiente")
      .is("mercadopago_payment_id", null)
      .select("id")
      .maybeSingle();

    if (actualizarError) {
      console.error(
        "Error al aprobar la compra:",
        actualizarError.message
      );
      return response("No se pudo actualizar la compra.", 500);
    }

    // 15. Comprobar si otra notificación procesó la compra al mismo tiempo.
    if (!actualizada) {
      const { data: compraActual, error: consultaFinalError } = await admin
        .from("compras_planes")
        .select("estado, mercadopago_payment_id")
        .eq("id", compra.id)
        .maybeSingle();

      if (consultaFinalError) {
        return response("No se pudo confirmar la compra.", 500);
      }

      if (
        compraActual?.estado === "aprobado" &&
        compraActual.mercadopago_payment_id === paymentId
      ) {
        return response("Pago ya procesado.", 200);
      }

      return response("No se pudo confirmar la compra.", 409);
    }

    return response("Pago aprobado correctamente.", 200);
  } catch (error) {
    console.error(
      "Error en webhook de Mercado Pago:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return response("Error interno al procesar la notificación.", 500);
  }
}
