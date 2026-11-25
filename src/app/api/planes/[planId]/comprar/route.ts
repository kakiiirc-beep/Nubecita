
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import MercadoPagoConfig, { Preference } from "mercadopago";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerAccessTokenMercadoPago } from "@/lib/mercadopago/renovar-token";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    planId: string;
  }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type PreferenciaConBackUrls = {
  back_urls?: {
    success?: string;
    pending?: string;
    failure?: string;
  };
};

function tieneBackUrlsActuales(
  preferencia: PreferenciaConBackUrls,
  origin: string,
  planId: string
): boolean {
  return (
    preferencia.back_urls?.success === `${origin}/mis-compras` &&
    preferencia.back_urls?.pending === `${origin}/mis-compras` &&
    preferencia.back_urls?.failure === `${origin}/planes/${planId}`
  );
}

export async function POST(_request: Request, context: Context) {
  try {
    const { planId } = await context.params;

    if (!planId) {
      return errorResponse("Plan no válido.", 400);
    }

    // 1. Comprobar sesión del comprador.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Debés iniciar sesión para comprar.", 401);
    }

    // 2. Comprobar que el comprador no esté suspendido.
    const { data: suspendida, error: suspensionError } =
      await supabase.rpc("mi_cuenta_esta_suspendida");

    if (suspensionError || suspendida === true) {
      return errorResponse(
        "Tu cuenta no está habilitada para realizar compras.",
        403
      );
    }

    const admin = createAdminClient();

    console.log("CHECKOUT: cliente admin creado");

    // 3. Obtener el plan.
    const { data: plan, error: planError } = await admin
      .from("planes")
      .select("id, user_id, nombre, descripcion, tipo, precio, activo")
      .eq("id", planId)
      .maybeSingle();

    if (planError) {
      console.error("Error al consultar el plan:", planError.message);
      return errorResponse("No se pudo consultar el plan.", 500);
    }

    if (!plan || plan.activo !== true || plan.tipo !== "pago") {
      return errorResponse("Este plan no está disponible para comprar.", 404);
    }

    const vendedorId = plan.user_id;

    if (!vendedorId || vendedorId === user.id) {
      return errorResponse("No podés comprar tu propio plan.", 403);
    }

    // 4. Validar el precio.
    const precio = Number(plan.precio);

    if (
      !Number.isFinite(precio) ||
      precio <= 0 ||
      Math.round(precio * 100) !== precio * 100
    ) {
      return errorResponse("El precio del plan no es válido.", 400);
    }

    // 5. Comprobar que la vendedora tenga rol modelo.
    const { data: perfil, error: perfilError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", vendedorId)
      .maybeSingle();

    console.log("DIAGNÓSTICO PERFIL VENDEDORA:", {
      encontrado: !!perfil,
      rol: perfil?.role ?? null,
      error: perfilError?.message ?? null,
      codigo: perfilError?.code ?? null,
    });

    if (perfilError || !perfil || perfil.role !== "modelo") {
      return errorResponse("La vendedora no está habilitada.", 403);
    }

    // 6. Comprobar que la cuenta de la modelo esté activa.
    const { data: moderacion, error: moderacionError } = await admin
      .from("moderacion_cuentas")
      .select("estado_cuenta")
      .eq("user_id", vendedorId)
      .maybeSingle();

    console.log("DIAGNÓSTICO MODERACIÓN:", {
      encontrado: !!moderacion,
      estado: moderacion?.estado_cuenta ?? null,
      error: moderacionError?.message ?? null,
      codigo: moderacionError?.code ?? null,
    });

    if (
      moderacionError ||
      !moderacion ||
      moderacion.estado_cuenta !== "activo"
    ) {
      return errorResponse("La cuenta de la modelo no está activa.", 403);
    }

    // 7. Comprobar que su última verificación esté aprobada.
    const { data: verificacion, error: verificacionError } = await admin
      .from("solicitudes_verificacion")
      .select("estado")
      .eq("user_id", vendedorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      verificacionError ||
      !verificacion ||
      verificacion.estado !== "aprobada"
    ) {
      return errorResponse(
        "La modelo todavía no tiene una verificación aprobada.",
        403
      );
    }

    // 8. Comprobar la conexión Sandbox de Mercado Pago.
    const { data: conexion, error: conexionError } = await admin
      .from("mercadopago_conexiones")
      .select("estado, entorno")
      .eq("user_id", vendedorId)
      .maybeSingle();

    if (
      conexionError ||
      !conexion ||
      conexion.estado !== "connected" ||
      conexion.entorno !== "pruebas"
    ) {
      return errorResponse(
        "La modelo no tiene una conexión de Mercado Pago de pruebas activa.",
        409
      );
    }

    // 9. Obtener el token de acceso de la modelo.
    const accessToken = await obtenerAccessTokenMercadoPago(vendedorId);

    console.log("CHECKOUT: token de vendedora obtenido:", !!accessToken);

    if (!accessToken) {
      return errorResponse(
        "No se pudo obtener la conexión de Mercado Pago.",
        409
      );
    }

    const mpConfig = new MercadoPagoConfig({
      accessToken,
    });

    const preferenceClient = new Preference(mpConfig);

    console.log("CHECKOUT: preferenceClient creado correctamente");

    // 10. Buscar una compra pendiente existente.
    const { data: compraExistente, error: compraError } = await admin
      .from("compras_planes")
      .select(
        "id, vendedor_id, importe, moneda, mercadopago_preference_id"
      )
      .eq("comprador_id", user.id)
      .eq("plan_id", planId)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (compraError) {
      console.error("Error al consultar compras:", compraError.message);
      return errorResponse("No se pudo consultar la compra.", 500);
    }

    let compraId: string;

    console.log(
      "CHECKOUT: compra pendiente encontrada:",
      !!compraExistente
    );

    if (compraExistente) {
      // Comprobar que la compra pendiente coincida con los datos actuales.
      const mismoImporte =
        Math.round(Number(compraExistente.importe) * 100) ===
        Math.round(precio * 100);

      if (
        compraExistente.vendedor_id !== vendedorId ||
        compraExistente.moneda !== "ARS" ||
        !mismoImporte
      ) {
        return errorResponse(
          "La compra pendiente tiene datos anteriores que no coinciden con el plan actual. Contactá con soporte.",
          409
        );
      }

      compraId = compraExistente.id;
    } else {
      // 11. Crear una compra pendiente.
      compraId = randomUUID();

      const { error: insertError } = await admin
        .from("compras_planes")
        .insert({
          id: compraId,
          comprador_id: user.id,
          vendedor_id: vendedorId,
          plan_id: planId,
          importe: precio,
          moneda: "ARS",
          estado: "pendiente",
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error al crear compra:", insertError.message);
        return errorResponse("No se pudo iniciar la compra.", 500);
      }
    }

    // 12. Preparar la URL base de NUBECITA.
    const baseUrl = process.env.NUBECITA_URL;

    if (!baseUrl) {
      return errorResponse("Falta configurar la URL de NUBECITA.", 500);
    }

    let origin: string;

    try {
      const parsedUrl = new URL(baseUrl);

      if (parsedUrl.protocol !== "https:") {
        return errorResponse("La URL de NUBECITA debe utilizar HTTPS.", 500);
      }

      origin = parsedUrl.origin;
    } catch {
      return errorResponse("La URL de NUBECITA no es válida.", 500);
    }

    // 13. PRUEBA TEMPORAL:
    // No recuperar la preferencia guardada ni buscar preferencias anteriores.
    // Así comprobamos la creación de una preferencia nueva con el token OAuth actual.
    console.log(
      "CHECKOUT: prueba de preferencia nueva. Se omite la recuperación anterior.",
      {
        tienePreferenciaAnterior: !!compraExistente?.mercadopago_preference_id,
        compraId,
      }
    );

    // 14. Calcular la comisión del 15%.
    const importeCentavos = Math.round(precio * 100);
    const comisionCentavos = Math.round(importeCentavos * 0.15);
    const comision = comisionCentavos / 100;

    // 15. Crear una preferencia nueva exclusivamente para pruebas.
    console.log("CHECKOUT: iniciando creación de preferencia nueva");

    const preferencia = await preferenceClient.create({
      body: {
        items: [
          {
            id: plan.id,
            title: String(plan.nombre),
            description: plan.descripcion
              ? String(plan.descripcion)
              : "Pack digital de NUBECITA",
            quantity: 1,
            currency_id: "ARS",
            unit_price: precio,
          },
        ],
        external_reference: compraId,
        marketplace_fee: comision,
        notification_url: `${origin}/api/mercadopago/webhook`,
        back_urls: {
          success: `${origin}/mis-compras`,
          pending: `${origin}/mis-compras`,
          failure: `${origin}/planes/${planId}`,
        },
      },
      requestOptions: {
        // Clave nueva para esta prueba.
        // Mantenerla igual permite que los reintentos no creen duplicados.
        idempotencyKey: `checkout-prueba-nueva-01-${compraId}`,
      },
    });

    console.log("CHECKOUT: preferencia nueva creada:", {
      preferenceId: preferencia.id,
      collectorId: preferencia.collector_id,
      marketplace: preferencia.marketplace,
      marketplaceFee: preferencia.marketplace_fee,
      externalReference: preferencia.external_reference,
    });

    // 16. Exigir el enlace Sandbox.
    if (!preferencia.sandbox_init_point) {
      console.error("Mercado Pago no devolvió un enlace Sandbox válido.");
      return errorResponse(
        "No se pudo generar el enlace de pago de pruebas.",
        502
      );
    }

    // 17. Comprobar que la preferencia nueva tenga las URLs correctas.
    if (!tieneBackUrlsActuales(preferencia, origin, planId)) {
      console.error(
        "CHECKOUT: Mercado Pago devolvió una preferencia con URLs incorrectas."
      );

      return errorResponse(
        "La preferencia de pago no tiene las direcciones de retorno esperadas.",
        502
      );
    }

    // 18. Guardar el ID de la preferencia nueva.
    const { error: updateError } = await admin
      .from("compras_planes")
      .update({
        mercadopago_preference_id: preferencia.id,
      })
      .eq("id", compraId);

    if (updateError) {
      console.error(
        "Error al guardar la preferencia:",
        updateError.message
      );

      return errorResponse(
        "Se creó el pago, pero no se pudo guardar su referencia. Podés reintentar.",
        500
      );
    }

    return NextResponse.json({
      preferenceId: preferencia.id,
    });
  } catch (error) {
    console.error("Error inesperado en checkout:", error);

    return errorResponse(
      "Ocurrió un error al iniciar el proceso de compra.",
      500
    );
  }
}
