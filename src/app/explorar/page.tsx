import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
type Props = {
  searchParams: Promise<{ usuario?: string }>;
};

export default async function ExplorarPage({ searchParams }: Props) {
  const { usuario } = await searchParams;
  const busqueda = usuario?.trim().replace(/^@/, "") || "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: perfilActual, error } = await supabase
      .from("profiles")
      .select("estado_cuenta")
      .eq("id", user.id)
      .single();

    if (error || !perfilActual) {
      redirect("/login");
    }

    if (perfilActual.estado_cuenta === "suspendido") {
      redirect("/cuenta-suspendida");
    }
  }

  let usuarios: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  }[] = [];

  if (busqueda) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, role")
      .eq("username", busqueda.toLowerCase())
      .limit(1);

    usuarios = data || [];
  }

  return (
    <main className="min-h-screen bg-[#0b080d] px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <a
            href="/inicio"
            className="text-2xl font-black tracking-[0.2em] text-sky-200"
          >
            NUBECITA
          </a>

          <a
            href="/inicio"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 hover:border-sky-200 hover:text-sky-200"
          >
            Inicio
          </a>
        </header>

        <h1 className="text-3xl font-bold">Explorar</h1>

        <p className="mt-2 text-sm text-gray-400">
          Buscá creadores por su nombre de usuario.
        </p>

        <form action="/explorar" method="GET" className="mt-7 flex gap-2">
          <input
            type="text"
            name="usuario"
            defaultValue={usuario || ""}
            placeholder="Buscar por @username"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#151019] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-sky-200"
          />

          <button
            type="submit"
            className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-200"
          >
            Buscar
          </button>
        </form>

        {busqueda && usuarios.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#151019] p-8 text-center">
            <div className="text-4xl">☁️</div>
            <h2 className="mt-4 text-lg font-semibold">
              No encontramos ese usuario
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Revisá el nombre e intentá nuevamente.
            </p>
          </div>
        )}

        {usuarios.map((perfil) => (
          <a
            key={perfil.id}
            href={`/perfil/${perfil.username}`}
            className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#151019] p-4 transition hover:border-sky-200/50"
          >
            {perfil.avatar_url ? (
              <img
                src={perfil.avatar_url}
                alt="Foto de perfil"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-200 text-2xl text-slate-950">
                ☁️
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {perfil.full_name || perfil.username}
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

              <p className="text-sm text-gray-400">
                @{perfil.username}
              </p>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}