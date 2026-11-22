
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
    const { data: suspendida, error } = await supabase.rpc(
      "mi_cuenta_esta_suspendida"
    );

    if (error) {
      console.error("Error al comprobar la suspensión:", error);
      redirect("/login");
    }

    if (suspendida === true) {
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
    <main className="relative isolate min-h-screen bg-white px-4 py-8 text-slate-900">
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

      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <a
            href="/inicio"
            className="text-2xl font-black tracking-[0.2em] text-sky-600"
          >
            NUBECITA
          </a>

          <a
            href="/inicio"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-400 hover:text-sky-600"
          >
            Inicio
          </a>
        </header>

        <h1 className="text-3xl font-bold text-slate-900">
          Explorar
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Buscá creadores por su nombre de usuario.
        </p>

        <form action="/explorar" method="GET" className="mt-7 flex gap-2">
          <input
            type="text"
            name="usuario"
            defaultValue={usuario || ""}
            placeholder="Buscar por @username"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
          />

          <button
            type="submit"
            className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
          >
            Buscar
          </button>
        </form>

        {busqueda && usuarios.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white/75 p-8 text-center shadow-sm">
            <div className="text-4xl">☁️</div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No encontramos ese usuario
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Revisá el nombre e intentá nuevamente.
            </p>
          </div>
        )}

        {usuarios.map((perfil) => (
          <a
            key={perfil.id}
            href={`/perfil/${perfil.username}`}
            className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#151019] p-4 text-white transition hover:border-sky-200/50"
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
