import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import BuscadorUsuarios from "@/components/BuscadorUsuarios";
import EliminarPublicacion from "@/components/EliminarPublicacion";
import EditarPublicacion from "@/components/EditarPublicacion";
import VerImagen from "@/components/VerImagen";
import PestanasPerfil from "@/components/PestanasPerfil";
import BotonSeguir from "@/components/BotonSeguir";
import SolicitarVerificacion from "@/components/SolicitarVerificacion";
import FotosPerfil from "@/components/FotosPerfil";

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
    const { data: perfilActual, error: perfilActualError } = await supabase
      .from("profiles")
      .select("estado_cuenta")
      .eq("id", user.id)
      .single();

    if (perfilActualError || !perfilActual) {
      redirect("/login");
    }

    if (perfilActual.estado_cuenta === "suspendido") {
      redirect("/cuenta-suspendida");
    }
  }

  const esPropietario = user?.id === perfil.id;

  async function obtenerUrlFoto(ruta: string | null) {
    if (!ruta) return null;

    if (ruta.startsWith("http")) return ruta;

    const { data, error } = await supabase.storage
      .from("Nubecita bucket")
      .createSignedUrl(ruta, 3600);

    return error ? null : data.signedUrl;
  }

  const [avatarUrl, coverUrl] = await Promise.all([
    obtenerUrlFoto(perfil.avatar_url),
    obtenerUrlFoto(perfil.cover_path),
  ]);

  const { data: cantidadSeguidores } = await supabase.rpc(
    "cantidad_seguidores",
    { p_perfil_id: perfil.id }
  );

  const { data: publicaciones } = await supabase
    .from("publicaciones")
    .select(
      "id, file_path, preview_path, description, mime_type, visibility, created_at"
    )
    .eq("user_id", perfil.id)
    .order("created_at", { ascending: false });

  const publicacionesConUrl = await Promise.all(
    (publicaciones || []).map(async (publicacion) => {
      const { data: original, error: originalError } =
        await supabase.storage
          .from("Nubecita bucket")
          .createSignedUrl(publicacion.file_path, 3600);

      let previewUrl = originalError ? null : original.signedUrl;

      if (publicacion.preview_path) {
        const { data: preview, error: previewError } =
          await supabase.storage
            .from("Nubecita bucket")
            .createSignedUrl(publicacion.preview_path, 3600);

        if (!previewError && preview) {
          previewUrl = preview.signedUrl;
        }
      }

      return {
        ...publicacion,
        url: originalError ? null : original.signedUrl,
        previewUrl,
      };
    })
  );

  const publicacionesVisibles = publicacionesConUrl.filter(
    (publicacion) => publicacion.url
  );

  const { data: planes } = await supabase
    .from("planes")
    .select(
      "id, nombre, descripcion, precio, tipo, portada_path, cantidad_fotos, cantidad_videos"
    )
    .eq("user_id", perfil.id)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0b080d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b080d]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-col items-center justify-between gap-3 px-5 py-3 sm:flex-row">
          <h1 className="text-xl font-black tracking-[0.25em] text-sky-200">
            NUBECITA
          </h1>

          <BuscadorUsuarios />

          <a
            href={user ? "/inicio" : "/"}
            className="hidden rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-sky-200 hover:text-sky-200 sm:block"
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

          <div className="relative -mt-32 px-4 sm:-mt-36 sm:px-8">
            <div className="flex flex-row items-end gap-4">
              <div className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" />

              <div className="min-w-0 pb-2">
                <h2 className="break-words text-xl font-bold sm:text-3xl">
                  {perfil.full_name || perfil.username}
                </h2>

                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm text-white">
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

            <div className="mt-4 flex items-center justify-end gap-3">
              <span className="text-sm font-semibold text-gray-400">
                {cantidadSeguidores ?? 0} Seguidores
              </span>

              <BotonSeguir
                perfilId={perfil.id}
                usuarioActualId={user?.id ?? null}
              />
            </div>

            {esPropietario && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="/editar-perfil"
                  className="inline-flex items-center rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-400"
                >
                  ✏️ Editar perfil
                </a>

                <div className="inline-flex items-center">
                  <SolicitarVerificacion usuarioId={perfil.id} />
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-white sm:text-base">
                {perfil.bio || "Este perfil todavía no tiene una descripción."}
              </p>
            </div>
          </div>
        </section>

        <div className="my-8 border-t border-white/10" />

        <section>
          <PestanasPerfil
            publicaciones={
              <>
                {publicacionesVisibles.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#151019] px-5 py-12 text-center">
                    <div className="text-3xl">📸</div>

                    <h3 className="mt-5 text-lg font-semibold">
                      Todavía no hay publicaciones
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
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
                {planes && planes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {planes.map((plan) => (
                      <article
                        key={plan.id}
                        className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#151019] p-4"
                      >
                        <div className="-mx-4 relative mb-4 h-48 overflow-hidden rounded-t-xl bg-[#0c2238]">
                          <img
                            src="/nube-default.svg"
                            alt=""
                            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
                          />

                          <img
                            src="/nube-default.svg"
                            alt="Portada predeterminada de NUBECITA"
                            className="relative z-10 h-full w-full object-contain"
                          />
                        </div>

                        <h3 className="text-lg font-bold text-white">
                          {plan.nombre}
                        </h3>

                        {plan.descripcion && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                            {plan.descripcion}
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Precio
                          </span>

                          <span className="text-lg font-bold text-sky-200">
                            {plan.tipo === "gratuito"
                              ? "Gratis"
                              : `$ ${Number(plan.precio).toLocaleString("es-AR")}`}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-4 text-sm text-gray-300">
                          {plan.cantidad_fotos > 0 && (
                            <span>📷 {plan.cantidad_fotos} fotos</span>
                          )}

                          {plan.cantidad_videos > 0 && (
                            <span>🎬 {plan.cantidad_videos} videos</span>
                          )}

                          {plan.cantidad_fotos === 0 &&
                            plan.cantidad_videos === 0 && (
                              <span className="text-gray-500">
                                Todavía no hay contenido
                              </span>
                            )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#151019] px-5 py-12 text-center">
                    <div className="text-3xl">⭐</div>

                    <h3 className="mt-5 text-lg font-semibold">
                      Todavía no hay planes
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
                      Cuando este usuario cree sus planes, aparecerán aquí.
                    </p>
                  </div>
                )}
              </>
            }
          />
        </section>

        <footer className="mt-12 text-center">
          <p className="text-xs tracking-widest text-white">
            NUBECITA
          </p>

          <p className="mt-2 text-xs text-white">
            Una comunidad para creadores.
          </p>
        </footer>
      </div>
    </main>
  );
}