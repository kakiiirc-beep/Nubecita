
import "server-only";

import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "Nubecita bucket";
const DURACION_URL_SEGUNDOS = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        planId
      )
    ) {
      return NextResponse.json(
        { error: "Identificador de plan inválido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión." },
        { status: 401 }
      );
    }

    const { data: suspendida, error: suspensionError } =
      await supabase.rpc("mi_cuenta_esta_suspendida");

    if (suspensionError || suspendida === true) {
      return NextResponse.json(
        { error: "No se puede acceder al contenido." },
        { status: 403 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Falta configuración de Supabase.");

      return NextResponse.json(
        { error: "No se pudo procesar la solicitud." },
        { status: 500 }
      );
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Primero verificamos que el plan exista.
    const { data: plan, error: planError } = await admin
      .from("planes")
      .select("id, user_id, tipo")
      .eq("id", planId)
      .maybeSingle();

    if (planError || !plan) {
  console.error("Error al verificar el plan:", {
  message: planError?.message,
  code: planError?.code,
  details: planError?.details,
  hint: planError?.hint,
});

  return NextResponse.json(
    { error: "No se pudo verificar el plan." },
    { status: 404 }
  );
}

    // La propietaria puede acceder a su propio plan sin comprarlo.
    const esPropietario = plan.user_id === user.id;

    // Si no es la propietaria, debe tener una compra vigente.
    if (!esPropietario && plan.tipo === "pago") {
      const { data: compra, error: compraError } = await admin
        .from("compras_planes")
        .select("id, vendedor_id")
        .eq("plan_id", planId)
        .eq("comprador_id", user.id)
        .eq("estado", "aprobado")
        .gt("vence_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (compraError) {
        console.error("Error al comprobar compra:", compraError);

        return NextResponse.json(
          { error: "No se pudo comprobar el acceso." },
          { status: 500 }
        );
      }

      if (!compra || plan.user_id !== compra.vendedor_id) {
  return NextResponse.json(
    {
      code: "PURCHASE_REQUIRED",
      error: "No tenés una compra vigente de este plan.",
    },
    { status: 403 }
  );
}
    }

    // Consultamos los archivos del plan.
    let archivosQuery = admin
      .from("plan_archivos")
      .select("id, file_path, preview_path, mime_type, descripcion, posicion")
      .eq("plan_id", planId);

    // La propietaria solamente necesita ver los archivos actualmente disponibles.
    if (esPropietario) {
      archivosQuery = archivosQuery.eq("disponible", true);
    }

    const { data: archivos, error: archivosError } = await archivosQuery
      .order("posicion", { ascending: true });

    if (archivosError) {
      console.error("Error al consultar archivos:", archivosError);

      return NextResponse.json(
        { error: "No se pudo cargar el contenido." },
        { status: 500 }
      );
    }

    const contenido = await Promise.all(
      (archivos || []).map(async (archivo) => {
        const { data: original, error: originalError } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(archivo.file_path, DURACION_URL_SEGUNDOS);

        if (originalError || !original) {
          throw new Error("No se pudo generar un enlace de contenido.");
        }

        let previewUrl = original.signedUrl;

        if (archivo.preview_path) {
          const { data: preview, error: previewError } = await admin.storage
            .from(BUCKET)
            .createSignedUrl(archivo.preview_path, DURACION_URL_SEGUNDOS);

          if (!previewError && preview) {
            previewUrl = preview.signedUrl;
          }
        }

        return {
          id: archivo.id,
          mime_type: archivo.mime_type,
          descripcion: archivo.descripcion,
          posicion: archivo.posicion,
          url: original.signedUrl,
          previewUrl,
        };
      })
    );

    return NextResponse.json(
      { contenido },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error al entregar contenido de plan:", error);

    return NextResponse.json(
      { error: "No se pudo entregar el contenido del plan." },
      { status: 500 }
    );
  }
}
