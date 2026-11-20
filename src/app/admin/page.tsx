import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccionesSolicitud from "@/components/AccionesSolicitud";
import RetirarVerificacion from "@/components/RetirarVerificacion";
import AccionesDenuncia from "@/components/AccionesDenuncia";
import AccionesCuenta from "@/components/AccionesCuenta";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: administrador, error: adminError } = await supabase
    .from("administradores")
    .select("nivel")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return <pre className="p-6 text-red-400">Error: {adminError.message}</pre>;
  }

  if (!administrador) redirect("/inicio");

  // Solicitudes de verificación
  const { data: solicitudes, error: solicitudesError } = await supabase
    .from("solicitudes_verificacion")
    .select("id, user_id, estado, created_at")
    .order("created_at", { ascending: false });

  // Perfiles verificados
  const { data: verificados, error: verificadosError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("role", "modelo")
    .order("username", { ascending: true });

  // Denuncias recibidas
  const { data: denuncias, error: denunciasError } = await supabase
    .from("denuncias")
    .select("id, denunciante_id, usuario_denunciado_id, publicacion_id, motivo, estado, created_at")
    .order("created_at", { ascending: false });

  // Cuentas de usuarios
  const { data: cuentas, error: cuentasError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, estado_cuenta, motivo_suspension")
    .order("username", { ascending: true });

  // Buscar perfiles relacionados con las solicitudes y denuncias
  const idsUsuarios = [
    ...new Set([
      ...(solicitudes || []).map((s) => s.user_id),
      ...(denuncias || []).flatMap((d) => [
        d.denunciante_id,
        d.usuario_denunciado_id,
      ]),
    ]),
  ];

  let perfiles: any[] = [];

  if (idsUsuarios.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", idsUsuarios);

    perfiles = data || [];
  }

  const perfilesPorId = new Map(
    perfiles.map((perfil) => [perfil.id, perfil])
  );

  return (
    <main className="min-h-screen bg-[#0b080d] px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 flex items-center justify-between">
          <a href="/inicio" className="text-2xl font-black tracking-[0.2em] text-sky-200">
            NUBECITA
          </a>
          <span className="rounded-full border border-sky-200/30 px-4 py-2 text-xs text-sky-200">
            Administración
          </span>
        </header>

        <h1 className="text-3xl font-bold">Panel de administración</h1>
        <p className="mt-3 text-gray-400">
          Bienvenido al centro de control de NUBECITA.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#151019] p-6">
            <div className="text-3xl">☁️</div>
            <h2 className="mt-4 text-lg font-semibold">Solicitudes de verificación</h2>
            <p className="mt-2 text-sm text-gray-400">
              {solicitudes?.filter((s) => s.estado === "pendiente").length || 0} solicitudes pendientes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151019] p-6">
            <div className="text-3xl">🛡️</div>
            <h2 className="mt-4 text-lg font-semibold">Administradores</h2>
            <p className="mt-2 text-sm text-gray-400">
              Tu nivel de acceso:{" "}
              {administrador.nivel === "principal"
                ? "Administrador principal"
                : "Administrador secundario"}.
            </p>
          </div>
        </section>

        {/* PERFILES VERIFICADOS */}
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold">Perfiles verificados</h2>

          {verificadosError ? (
            <p className="text-red-300">Error: {verificadosError.message}</p>
          ) : !verificados || verificados.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#151019] p-8 text-center">
              <div className="text-4xl">☁️</div>
              <p className="mt-3 text-gray-400">Todavía no hay perfiles verificados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {verificados.map((perfil) => (
                <article key={perfil.id} className="rounded-2xl border border-white/10 bg-[#151019] p-5">
                  <p className="font-semibold">
                    {perfil.full_name || perfil.username || "Usuario"}
                    <span className="ml-2 text-sky-300">✓</span>
                  </p>
                  <p className="text-sm text-gray-400">@{perfil.username || "sin usuario"}</p>
                  <RetirarVerificacion usuarioId={perfil.id} />
                </article>
              ))}
            </div>
          )}
        </section>

        {/* SOLICITUDES */}
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold">Solicitudes recibidas</h2>

          {solicitudesError ? (
            <p className="text-red-300">Error: {solicitudesError.message}</p>
          ) : !solicitudes || solicitudes.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#151019] p-8 text-gray-400">
              Todavía no hay solicitudes.
            </p>
          ) : (
            <div className="space-y-4">
              {solicitudes.map((solicitud) => {
                const perfil = perfilesPorId.get(solicitud.user_id);

                return (
                  <article key={solicitud.id} className="rounded-2xl border border-white/10 bg-[#151019] p-5">
                    <p className="font-semibold">
                      {perfil?.full_name || perfil?.username || "Usuario"}
                    </p>
                    <p className="text-sm text-gray-400">
                      @{perfil?.username || "sin usuario"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(solicitud.created_at).toLocaleDateString("es-AR")}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs">
                      {solicitud.estado}
                    </span>

                    {solicitud.estado === "pendiente" && (
                      <AccionesSolicitud solicitudId={solicitud.id} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* DENUNCIAS */}
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold">Denuncias recibidas</h2>

          {denunciasError ? (
            <p className="text-red-300">Error: {denunciasError.message}</p>
          ) : !denuncias || denuncias.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#151019] p-8 text-center">
              <div className="text-4xl">🛡️</div>
              <p className="mt-3 text-gray-400">Todavía no hay denuncias.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {denuncias.map((denuncia) => {
                const denunciante = perfilesPorId.get(denuncia.denunciante_id);
                const denunciado = perfilesPorId.get(denuncia.usuario_denunciado_id);

                return (
                  <article key={denuncia.id} className="rounded-2xl border border-white/10 bg-[#151019] p-5">
                    <p className="text-xs text-gray-500">
                      {new Date(denuncia.created_at).toLocaleDateString("es-AR")}
                    </p>

                    <p className="mt-3 text-sm text-gray-400">Denunciante</p>
                    <p className="font-semibold">
                      {denunciante?.full_name || denunciante?.username || "Usuario"}
                      <span className="ml-2 text-sm text-gray-400">
                        @{denunciante?.username || "sin usuario"}
                      </span>
                    </p>

                    <p className="mt-4 text-sm text-gray-400">Usuario denunciado</p>
                    <p className="font-semibold">
                      {denunciado?.full_name || denunciado?.username || "Usuario"}
                      <span className="ml-2 text-sm text-gray-400">
                        @{denunciado?.username || "sin usuario"}
                      </span>
                    </p>

                    {denuncia.publicacion_id && (
                      <p className="mt-3 text-xs text-gray-400">
                        Publicación denunciada: {denuncia.publicacion_id}
                      </p>
                    )}

                    <div className="mt-4 rounded-xl bg-black/20 p-4">
                      <p className="text-xs text-gray-400">Motivo de la denuncia</p>
                      <p className="mt-2 text-sm">{denuncia.motivo}</p>
                    </div>

                    <span className="mt-4 inline-block rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                      {denuncia.estado}
                    </span>

                    {denuncia.estado === "pendiente" && (
                      <AccionesDenuncia denunciaId={denuncia.id} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* GESTIÓN DE CUENTAS */}
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold">Gestión de cuentas</h2>

          {cuentasError ? (
            <p className="text-red-300">Error: {cuentasError.message}</p>
          ) : !cuentas || cuentas.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#151019] p-8 text-gray-400">
              No hay cuentas disponibles.
            </p>
          ) : (
            <div className="space-y-4">
              {cuentas.map((cuenta) => (
                <article key={cuenta.id} className="rounded-2xl border border-white/10 bg-[#151019] p-5">
                  <p className="font-semibold">
                    {cuenta.full_name || cuenta.username || "Usuario"}
                  </p>
                  <p className="text-sm text-gray-400">
                    @{cuenta.username || "sin usuario"}
                  </p>

                  <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${
                    cuenta.estado_cuenta === "suspendido"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-green-500/10 text-green-300"
                  }`}>
                    {cuenta.estado_cuenta || "activo"}
                  </span>

                  {cuenta.motivo_suspension && (
                    <p className="mt-3 text-sm text-gray-400">
                      Motivo: {cuenta.motivo_suspension}
                    </p>
                  )}

                  <AccionesCuenta
                    usuarioId={cuenta.id}
                    estado={cuenta.estado_cuenta || "activo"}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <a
          href="/inicio"
          className="mt-10 inline-block rounded-xl bg-sky-300 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-200"
        >
          Volver al inicio
        </a>
      </div>
    </main>
  );
}