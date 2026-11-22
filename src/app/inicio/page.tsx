
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  // Buscar a las personas que sigue el usuario
  const { data: seguimientos } = await supabase
    .from("seguimientos")
    .select("seguido_id")
    .eq("seguidor_id", user.id);

  const usuariosSeguidos = (seguimientos || []).map(
    (seguimiento) => seguimiento.seguido_id
  );

  let publicaciones: any[] = [];

  // Buscar publicaciones públicas de las personas seguidas
  if (usuariosSeguidos.length > 0) {
    const { data: publicacionesData } = await supabase
      .from("publicaciones")
      .select(
        "id, user_id, file_path, preview_path, description, mime_type, created_at"
      )
      .in("user_id", usuariosSeguidos)
      .eq("visibility", "publico")
      .order("created_at", { ascending: false });

    // Buscar los perfiles de quienes publicaron
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, role")
      .in("id", usuariosSeguidos);

    const perfilesPorId = new Map(
      (perfiles || []).map((perfil) => [perfil.id, perfil])
    );

    // Crear enlaces seguros para las publicaciones
    publicaciones = await Promise.all(
      (publicacionesData || []).map(async (publicacion) => {
        const { data: original, error: originalError } =
          await supabase.storage
            .from("Nubecita bucket")
            .createSignedUrl(publicacion.file_path, 3600);

        if (originalError || !original) {
          return null;
        }

        let previewUrl = original.signedUrl;

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
          url: original.signedUrl,
          previewUrl,
          perfil: perfilesPorId.get(publicacion.user_id),
        };
      })
    );

    publicaciones = publicaciones.filter(
      (publicacion) => publicacion && publicacion.perfil
    );
  }

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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
            <a
              href="/inicio"
              className="text-2xl font-black tracking-[0.2em] text-sky-600"
            >
              NUBECITA
            </a>

            <a
              href="/explorar"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-400 hover:text-sky-600"
            >
              Explorar
            </a>
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Inicio
          </h1>

          <p className="mb-8 text-sm text-slate-600">
            Las novedades de las personas que seguís.
          </p>

          {publicaciones.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/75 px-6 py-14 text-center shadow-sm">
              <div className="text-4xl">☁️</div>

              <h2 className="mt-5 text-xl font-semibold text-slate-900">
                Tu inicio está esperando novedades
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
                Cuando sigas a otros creadores y compartan publicaciones públicas,
                vas a poder verlas acá.
              </p>

              <a
                href="/explorar"
                className="mt-6 inline-block rounded-xl bg-sky-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
              >
                Explorar usuarios
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {publicaciones.map((publicacion) => (
                <article
                  key={publicacion.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#151019]"
                >
                  <div className="flex items-center gap-3 p-4">
                    {publicacion.perfil.avatar_url ? (
                      <img
                        src={publicacion.perfil.avatar_url}
                        alt="Foto de perfil"
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-200 text-lg text-slate-950">
                        ☁️
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/perfil/${publicacion.perfil.username}`}
                          className="font-semibold text-white hover:text-sky-200"
                        >
                          {publicacion.perfil.full_name ||
                            publicacion.perfil.username}
                        </a>

                        {publicacion.perfil.role === "modelo" && (
                          <span
                            title="Perfil verificado"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-xs font-bold text-slate-950"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400">
                        @{publicacion.perfil.username}
                      </p>
                    </div>
                  </div>

                  {publicacion.mime_type.startsWith("image/") ? (
                    <img
                      src={publicacion.previewUrl || publicacion.url}
                      alt={publicacion.description || "Publicación"}
                      className="max-h-[650px] w-full bg-black object-contain"
                    />
                  ) : (
                    <video
                      src={publicacion.url}
                      controls
                      preload="metadata"
                      className="max-h-[650px] w-full bg-black"
                    />
                  )}

                  {publicacion.description && (
                    <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-white">
                      {publicacion.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
