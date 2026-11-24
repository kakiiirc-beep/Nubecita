
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const BUCKET = "Nubecita bucket";
const DURACION_URL_SEGUNDOS = 300;

export default async function MisComprasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: suspendida, error: suspensionError } =
    await supabase.rpc("mi_cuenta_esta_suspendida");

  if (suspensionError || suspendida === true) {
    return <main className="p-6">No se puede acceder a las compras.</main>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Falta configuración de Supabase.");
    throw new Error("No se pudieron cargar tus compras.");
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: compras, error: comprasError } = await admin
    .from("compras_planes")
    .select("id, plan_id, vendedor_id, vence_at, importe, moneda, created_at")
    .eq("comprador_id", user.id)
    .eq("estado", "aprobado")
    .gt("vence_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (comprasError) {
    console.error("Error al consultar mis compras:", comprasError);
    throw new Error("No se pudieron cargar tus compras.");
  }

  const planIds = [...new Set((compras || []).map((compra) => compra.plan_id))];

  let planes: {
    id: string;
    user_id: string;
    nombre: string;
    descripcion: string | null;
  }[] = [];

  if (planIds.length > 0) {
    const { data, error } = await admin
      .from("planes")
      .select("id, user_id, nombre, descripcion")
      .in("id", planIds);

    if (error) {
      console.error("Error al consultar planes:", error);
      throw new Error("No se pudieron cargar los planes.");
    }

    planes = data || [];
  }

  // Solo conservar compras cuyo vendedor siga siendo el propietario del plan.
  const comprasValidas = (compras || []).filter((compra) => {
    const plan = planes.find((item) => item.id === compra.plan_id);
    return plan && plan.user_id === compra.vendedor_id;
  });

  const planesValidos = planes.filter((plan) =>
    comprasValidas.some((compra) => compra.plan_id === plan.id)
  );

  const planIdsValidos = planesValidos.map((plan) => plan.id);

  let archivos: {
    id: string;
    plan_id: string;
    file_path: string;
    mime_type: string;
    descripcion: string | null;
    posicion: number;
  }[] = [];

  if (planIdsValidos.length > 0) {
    const { data, error } = await admin
      .from("plan_archivos")
      .select("id, plan_id, file_path, mime_type, descripcion, posicion")
      .in("plan_id", planIdsValidos)
      .order("posicion", { ascending: true });

    if (error) {
      console.error("Error al consultar archivos:", error);
      throw new Error("No se pudo cargar el contenido.");
    }

    archivos = data || [];
  }

  const contenidoPorPlan = await Promise.all(
    archivos.map(async (archivo) => {
      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(archivo.file_path, DURACION_URL_SEGUNDOS);

      if (error || !data) {
        console.error("No se pudo generar un enlace para un archivo.");
        return null;
      }

      return {
        ...archivo,
        url: data.signedUrl,
      };
    })
  );

  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Mis compras</h1>

      {comprasValidas.length > 0 ? (
        <div className="space-y-6">
          {comprasValidas.map((compra) => {
            const plan = planesValidos.find(
              (item) => item.id === compra.plan_id
            );

            if (!plan) return null;

            const archivosDelPlan = contenidoPorPlan.filter(
              (archivo) => archivo?.plan_id === plan.id
            );

            return (
              <section
                key={compra.id}
                className="rounded-xl border border-gray-200 p-5"
              >
                <h2 className="text-xl font-semibold">{plan.nombre}</h2>

                {plan.descripcion && (
                  <p className="mt-2 text-sm text-gray-600">
                    {plan.descripcion}
                  </p>
                )}

                <p className="mt-3 text-sm text-gray-500">
                  Vence:{" "}
                  {new Date(compra.vence_at).toLocaleString("es-AR")}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Importe: ${" "}
                  {Number(compra.importe).toLocaleString("es-AR")}{" "}
                  {compra.moneda}
                </p>

                <div className="mt-5 space-y-4">
                  {archivosDelPlan.length > 0 ? (
                    archivosDelPlan.map((archivo) => {
                      if (!archivo) return null;

                      if (archivo.mime_type.startsWith("image/")) {
                        return (
                          <div key={archivo.id}>
                            <p className="mb-2 text-sm font-medium">
                              {archivo.descripcion || "Imagen"}
                            </p>
                            <a
                              href={archivo.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={archivo.url}
                                alt={archivo.descripcion || "Contenido"}
                                className="max-h-[500px] w-auto rounded-lg"
                              />
                            </a>
                          </div>
                        );
                      }

                      if (archivo.mime_type.startsWith("video/")) {
                        return (
                          <div key={archivo.id}>
                            <p className="mb-2 text-sm font-medium">
                              {archivo.descripcion || "Video"}
                            </p>
                            <video
                              src={archivo.url}
                              controls
                              playsInline
                              className="max-h-[500px] w-full rounded-lg"
                            />
                          </div>
                        );
                      }

                      return (
                        <a
                          key={archivo.id}
                          href={archivo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-blue-600 underline"
                        >
                          {archivo.descripcion || "Abrir archivo"}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">
                      Este plan todavía no tiene contenido disponible.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">
          Todavía no tenés compras vigentes.
        </p>
      )}
    </main>
  );
}
