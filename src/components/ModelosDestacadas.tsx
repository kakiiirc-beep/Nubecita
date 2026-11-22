"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Modelo = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type ModeloMostrada = Modelo & {
  foto: string | null;
};

export default function ModelosDestacadas() {
  const [modelos, setModelos] = useState<ModeloMostrada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarModelos() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "obtener_modelos_destacadas"
      );

      if (error) {
        console.error("Error al cargar modelos destacadas:", error);
        setMensaje("No se pudieron cargar las modelos destacadas.");
        setCargando(false);
        return;
      }

      const lista = (data ?? []) as Modelo[];

      const modelosConFotos = await Promise.all(
        lista.map(async (modelo) => {
          if (!modelo.avatar_url) {
            return { ...modelo, foto: null };
          }

          if (modelo.avatar_url.startsWith("http")) {
            return { ...modelo, foto: modelo.avatar_url };
          }

          const { data: fotoData, error: fotoError } =
            await supabase.storage
              .from("Nubecita bucket")
              .createSignedUrl(modelo.avatar_url, 3600);

          if (fotoError) {
            console.error("Error al cargar foto:", fotoError);
          }

          return {
            ...modelo,
            foto: fotoData?.signedUrl ?? null,
          };
        })
      );

      setModelos(modelosConFotos);
      setCargando(false);
    }

    cargarModelos();
  }, []);

  return (
    <section
      id="modelos"
      className="scroll-mt-24 px-5 py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-sky-500">
            NUBECITA
          </span>

          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            Modelos destacadas
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            DescubrÃ­ creadoras verificadas y conocÃ© sus perfiles.
          </p>
        </div>

        {cargando && (
          <p className="py-8 text-center text-slate-500">
            Cargando modelos...
          </p>
        )}

        {!cargando && mensaje && (
          <p className="py-8 text-center text-red-500">
            {mensaje}
          </p>
        )}

        {!cargando && modelos.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modelos.map((modelo) => (
              <article
                key={modelo.id}
                className="overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-sky-100 bg-sky-50">
                  {modelo.foto ? (
                    <img
                      src={modelo.foto}
                      alt={modelo.full_name || "Foto de perfil"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-sky-400">
                      {(modelo.full_name || modelo.username || "N")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  {modelo.full_name || modelo.username || "Modelo"}
                  <span
                    className="ml-2 text-sky-500"
                    title="Modelo verificada"
                  >
                    âœ“
                  </span>
                </h3>

                {modelo.username && (
                  <p className="mt-1 text-sm text-sky-600">
                    @{modelo.username}
                  </p>
                )}

                {modelo.bio && (
                  <p className="mt-4 line-clamp-3 text-sm text-slate-600">
                    {modelo.bio}
                  </p>
                )}

                {modelo.username && (
                  <Link
                    href={`/perfil/${encodeURIComponent(modelo.username)}`}
                    className="mt-6 inline-block rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                  >
                    Ver perfil
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}



        <div className="mt-16 rounded-3xl border border-sky-100 bg-white/80 px-6 py-12 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Â¿QuerÃ©s estar entre las modelos destacadas?
          </h3>

          <p className="mt-3 text-lg font-semibold text-sky-600">
            PublicÃ¡, vendÃ© y ganÃ¡ tu lugar.
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            CompartÃ­ tu contenido, ofrecÃ© tus planes y hacÃ© crecer tu
            comunidad en NUBECITA.
          </p>

          <Link
            href="/registro"
            className="mt-7 inline-block rounded-full bg-sky-500 px-8 py-3 font-semibold text-white transition hover:bg-sky-600"
          >
            Crear mi cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
