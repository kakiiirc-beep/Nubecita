
import Link from "next/link";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import BuscadorUsuarios from "@/components/BuscadorUsuarios";
import EliminarPublicacion from "@/components/EliminarPublicacion";
import EliminarPlan from "@/components/EliminarPlan";
import EditarPlan from "@/components/EditarPlan";
import EditarPublicacion from "@/components/EditarPublicacion";
import VerImagen from "@/components/VerImagen";
import PestanasPerfil from "@/components/PestanasPerfil";
import BotonSeguir from "@/components/BotonSeguir";
import BotonDonar from "@/components/BotonDonar";
import FotosPerfil from "@/components/FotosPerfil";
import CrearPlanAviso from "@/components/CrearPlanAviso";
import EditarPerfilModal from "@/components/EditarPerfilModal";
import NotificacionFotos from "@/components/NotificacionFotos";
import DesconectarMercadoPago from "@/components/DesconectarMercadoPago";

export default async function PerfilPublico({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, cover_path, bio, role")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error || !perfil) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: suspendida, error: suspensionError } = await supabase.rpc(
      "mi_cuenta_esta_suspendida"
    );

    if (suspensionError) {
      console.error("Error al comprobar la suspensión:", suspensionError);
      redirect("/login");
    }

    if (suspendida === true) {
      redirect("/cuenta-suspendida");
    }
  }

  const esPropietario = user?.id === perfil.id;

  let mercadoPagoConectado = false;

  if (esPropietario && perfil.role === "modelo") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
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

      const { data: conexion, error: conexionError } = await admin
        .from("mercadopago_conexiones")
        .select("user_id")
        .eq("user_id", perfil.id)
        .eq("estado", "connected")
        .maybeSingle();

      if (conexionError) {
        console.error(
          "[Mercado Pago] Error al consultar conexión:",
          conexionError.message
        );
      } else {
        mercadoPagoConectado = Boolean(conexion);
      }
    }
  }

  let estadoSolicitud: string | null = null;

  if (esPropietario) {
    const { data: solicitud } = await supabase
      .from("solicitudes_verificacion")
      .select("estado")
      .eq("user_id", perfil.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    estadoSolicitud = solicitud?.estado ?? null;
  }

  // Cliente administrativo para generar enlaces firmados del almacenamiento.
  const supabaseUrlAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKeyAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminStorage =
    supabaseUrlAdmin && serviceRoleKeyAdmin
      ? createSupabaseAdmin(supabaseUrlAdmin, serviceRoleKeyAdmin, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        })
      : null;

  async function obtenerUrlFoto(ruta: string | null) {
    if (!ruta) return null;

    if (ruta.startsWith("http")) return ruta;

    if (!adminStorage) {
      console.error(
        "No está disponible el cliente administrativo de Supabase."
      );
      return null;
    }

    const { data, error } = await adminStorage.storage
      .from("Nubecita bucket")
      .createSignedUrl(ruta, 3600);

    return error || !data ? null : data.signedUrl;
  }

  const [avatarUrl, coverUrl] = await Promise.all([
    obtenerUrlFoto(perfil.avatar_url),
    obtenerUrlFoto(perfil.cover_path),
  ]);

  const { data: cantidadSeguidores } = await supabase.rpc(
    "cantidad_seguidores",
    { p_perfil_id: perfil.id }
  );

  // La consulta conserva las políticas de acceso del usuario.
  let publicacionesQuery = supabase
    .from("publicaciones")
    .select(
      "id, file_path, preview_path, description, mime_type, visibility, created_at"
    )
    .eq("user_id", perfil.id);

  if (!esPropietario) {
    publicacionesQuery = publicacionesQuery.eq("visibility", "publico");
  }

  const { data: publicaciones } = await publicacionesQuery.order(
    "created_at",
    { ascending: false }
  );

  // Los enlaces se generan con el cliente administrativo solamente
  // para los archivos que la consulta anterior permitió obtener.
  const publicacionesConUrl = await Promise.all(
    (publicaciones || []).map(async (publicacion) => {
      if (!adminStorage) {
        return {
          ...publicacion,
          url: null,
          previewUrl: null,
        };
      }

      const { data: original, error: originalError } =
        await adminStorage.storage
          .from("Nubecita bucket")
          .createSignedUrl(publicacion.file_path, 3600);

      let previewUrl = originalError ? null : original?.signedUrl ?? null;

      if (publicacion.preview_path) {
        const { data: preview, error: previewError } =
          await adminStorage.storage
            .from("Nubecita bucket")
            .createSignedUrl(publicacion.preview_path, 3600);

        if (!previewError && preview) {
          previewUrl = preview.signedUrl;
        }
      }

      return {
        ...publicacion,
        url: originalError ? null : original?.signedUrl ?? null,
        previewUrl,
      };
    })
  );

  const publicacionesVisibles = publicacionesConUrl.filter(
    (publicacion) => publicacion.url
  );

  const cantidadFotos = publicacionesVisibles.filter((p) =>
    p.mime_type.startsWith("image/")
  ).length;

  const cantidadVideos = publicacionesVisibles.filter((p) =>
    p.mime_type.startsWith("video/")
  ).length;

  const { data: planes } = await supabase
    .from("planes")
    .select(
      "id, nombre, descripcion, precio, tipo, portada_path, cantidad_fotos, cantidad_videos"
    )
    .eq("user_id", perfil.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  const planesConPortada = await Promise.all(
    (planes || []).map(async (plan) => {
      const portadaUrl = await obtenerUrlFoto(plan.portada_path);

      return {
        ...plan,
        portadaUrl,
      };
    })
  );

  return (
    <main className="relative isolate min-h-screen bg-white text-slate-900">
      {/* Fondo blanco con nubes celestes difuminadas y fijas */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: `
            radial-gradient(ellipse 38% 25% at 12% 18%, rgba(125, 211, 252, 0.42), transparent 75%),
            radial-gradient(ellipse 35% 28% at 85% 22%, rgba(147, 197, 253, 0.38), transparent 75%),
            radial-gradient(ellipse 42% 30% at 48% 55%, rgba(186, 230, 253, 0.45), transparent 75%),
            radial-gradient(ellipse 35% 25% at 15% 88%, rgba(125, 211, 252, 0.35), transparent 75%),
            radial-gradient(ellipse 38% 28% at 90% 85%, rgba(147, 197, 253, 0.38), transparent 75%)
          `,
        }}
      />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-5xl flex-col items-center justify-between gap-3 px-5 py-3 sm:flex-row">
            <a
              href={user ? "/inicio" : "/registro"}
              className="text-xl font-black tracking-[0.25em] text-sky-600 transition hover:text-sky-500"
            >
              NUBECITA
            </a>

            <BuscadorUsuarios />

            <a
              href={user ? "/inicio" : "/"}
              className="hidden rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-700 transition hover:border-sky-400 hover:text-sky-600 sm:block"
            >
              Inicio
            </a>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
          <section className="relative">
            <FotosPerfil
              userId={perfil.id}
              esPropietario={esPropietario}
              avatarUrl={avatarUrl}
              coverUrl={coverUrl}
            />

            <div className="absolute right-4 top-40 z-40 flex w-44 flex-col items-end gap-2 sm:right-8 sm:top-64">
              {esPropietario && (
                <EditarPerfilModal
                  userId={perfil.id}
                  username={perfil.username}
                />
              )}

              {!esPropietario && user && perfil.role === "modelo" && (
                <BotonDonar modeloId={perfil.id} />
              )}
            </div>

            <div className="absolute left-4 top-4 z-0 flex flex-wrap items-center gap-4 px-5 py-3 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_55%,transparent_100%)] sm:left-8">
              <span className="text-sm font-semibold text-gray-300">
                {cantidadSeguidores ?? 0} Seguidores
              </span>

              <div className="flex items-center gap-4 text-sm font-semibold text-gray-300">
                <span>{cantidadFotos} Fotos</span>
                <span>{cantidadVideos} Videos</span>
              </div>
            </div>

            <div className="ml-28 flex items-center gap-4 px-4 pt-4 sm:ml-36 sm:px-8">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-slate-900 sm:text-3xl">
                  {perfil.full_name || perfil.username}
                </h2>

                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-slate-600">
                    @{perfil.username}
                  </p>

                  {perfil.role === "modelo" && (
                    <span
                      title="Perfil verificado"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-xs font-bold text-slate-950"
                    >
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>

            <NotificacionFotos />

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <BotonSeguir
                perfilId={perfil.id}
                usuarioActualId={user?.id ?? null}
              />
            </div>

            {esPropietario && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a
                  href="/subir-contenido"
                  className="flex w-full items-center justify-center rounded-2xl bg-sky-500 px-3 py-4 text-center text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600"
                >
                  ＋ SUBIR PUBLICACIÓN
                </a>

                <CrearPlanAviso
                  ubicacion="perfil"
                  verificado={estadoSolicitud === "aprobada"}
                />
              </div>
            )}

            {esPropietario && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {estadoSolicitud === "pendiente" ? (
                  <span className="inline-flex items-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-700">
                    Solicitud en revisión
                  </span>
                ) : estadoSolicitud === "aprobada" ? (
                  <>
                    <span className="inline-flex items-center rounded-xl border border-sky-300/50 bg-sky-100/70 px-5 py-3 text-sm font-semibold text-sky-700">
                      Cuenta verificada ✓
                    </span>

                    {perfil.role === "modelo" &&
                      (mercadoPagoConectado ? (
                        <DesconectarMercadoPago />
                      ) : (
                        <a
                          href="/api/mercadopago/conectar"
                          className="inline-flex items-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                        >
                          Conectar Mercado Pago
                        </a>
                      ))}
                  </>
                ) : (
                  <a
                    href="/solicitar-verificacion"
                    className="inline-flex items-center rounded-xl border border-sky-300/50 bg-sky-100/70 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    Solicitar verificación
                  </a>
                )}
              </div>
            )}

            <div className="mt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">
                {perfil.bio || "Este perfil todavía no tiene una descripción."}
              </p>
            </div>
          </section>

          <div className="my-8 border-t border-slate-200" />

          <section>
            <PestanasPerfil
              publicaciones={
                <>
                  {publicacionesVisibles.length === 0 ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-12 text-center text-black">
                      <div className="text-3xl">📸</div>

                      <h3 className="mt-5 text-lg font-semibold text-black">
                        Todavía no hay publicaciones
                      </h3>

                      <p className="mt-2 text-sm text-slate-700">
                        Cuando este usuario comparta fotos y videos, aparecerán aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
                      {publicacionesVisibles.map((publicacion) => (
                        <article
                          key={publicacion.id}
                          className="overflow-hidden rounded-xl border border-white/10 bg-[#151019]"
                        >
                          {publicacion.mime_type.startsWith("image/") ? (
                            <VerImagen
                              url={publicacion.url!}
                              previewUrl={publicacion.previewUrl || publicacion.url!}
                              alt={publicacion.description || "Publicación"}
                              imagenes={publicacionesVisibles
                                .filter((p) => p.mime_type.startsWith("image/"))
                                .map((p) => ({
                                  url: p.url!,
                                  previewUrl: p.previewUrl || p.url!,
                                  alt: p.description || "Publicación",
                                }))}
                              indice={publicacionesVisibles
                                .filter((p) => p.mime_type.startsWith("image/"))
                                .findIndex((p) => p.id === publicacion.id)}
                            />
                          ) : (
                            <video
                              src={publicacion.url!}
                              controls
                              preload="metadata"
                              className="aspect-square w-full bg-black object-contain"
                            />
                          )}

                          {publicacion.description && (
                            <p className="p-3 text-sm text-white">
                              {publicacion.description}
                            </p>
                          )}

                          {esPropietario && (
                            <EliminarPublicacion
                              publicationId={publicacion.id}
                              filePath={publicacion.file_path}
                              previewPath={publicacion.preview_path}
                              userId={perfil.id}
                            />
                          )}

                          {esPropietario && (
                            <EditarPublicacion
                              publicationId={publicacion.id}
                              description={publicacion.description || ""}
                              visibility={publicacion.visibility}
                              userId={perfil.id}
                            />
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </>
              }
              planes={
                <>
                  {planesConPortada.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {planesConPortada.map((plan) => (
                        <article
                          key={plan.id}
                          className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-sky-200 bg-sky-100 p-0 text-black shadow-sm"
                        >
                          <Link
                            href={`/planes/${plan.id}`}
                            className="block cursor-pointer transition hover:bg-sky-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                            aria-label={`Abrir contenido del plan ${plan.nombre}`}
                          >
                            <div className="-mx-4 relative mb-4 h-48 overflow-hidden rounded-t-xl bg-sky-200">
                              {plan.portadaUrl ? (
                                <>
                                  <img
                                    src={plan.portadaUrl}
                                    alt=""
                                    className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
                                  />

                                  <img
                                    src={plan.portadaUrl}
                                    alt={`Portada del plan ${plan.nombre}`}
                                    className="relative z-10 h-full w-full object-cover"
                                  />
                                </>
                              ) : (
                                <img
                                  src="/nube-default.svg"
                                  alt="Portada predeterminada de NUBECITA"
                                  className="relative z-10 h-full w-full object-contain"
                                />
                              )}
                            </div>

                            <h3 className="px-4 pt-4 text-lg font-bold text-black">
                              {plan.nombre}
                            </h3>

                            {plan.descripcion && (
                              <p className="mt-2 px-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                {plan.descripcion}
                              </p>
                            )}

                            <div className="mx-4 mt-5 flex items-center justify-between">
                              <span className="text-sm text-slate-800">
                                Precio
                              </span>

                              <span className="text-lg font-bold text-black">
                                {plan.tipo === "gratuito"
                                  ? "Gratis"
                                  : `$ ${Number(plan.precio).toLocaleString("es-AR")}`}
                              </span>
                            </div>

                            <div className="mx-4 mt-4 flex flex-wrap gap-4 border-t border-sky-300 pt-4 text-sm text-slate-800">
                              {plan.cantidad_fotos > 0 && (
                                <span>📷 {plan.cantidad_fotos} fotos</span>
                              )}

                              {plan.cantidad_videos > 0 && (
                                <span>🎬 {plan.cantidad_videos} videos</span>
                              )}

                              {plan.cantidad_fotos === 0 &&
                                plan.cantidad_videos === 0 && (
                                  <span className="text-slate-700">
                                    Todavía no hay contenido
                                  </span>
                                )}
                            </div>
                          </Link>

                          {esPropietario && (
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-sky-300 pt-4">
                              <EditarPlan
                                planId={plan.id}
                                userId={perfil.id}
                              />

                              <EliminarPlan
                                planId={plan.id}
                                userId={perfil.id}
                              />
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-12 text-center text-black">
                      <div className="text-3xl">⭐</div>

                      <h3 className="mt-5 text-lg font-semibold text-black">
                        Todavía no hay planes
                      </h3>

                      <p className="mt-2 text-sm text-slate-700">
                        Cuando este usuario cree sus planes, aparecerán aquí.
                      </p>
                    </div>
                  )}
                </>
              }
            />
          </section>

          <footer className="mt-12 text-center">
            <p className="text-xs tracking-widest text-slate-700">
              NUBECITA
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Una comunidad para creadores.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
