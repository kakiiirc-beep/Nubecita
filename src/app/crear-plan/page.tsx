
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CrearPlan() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("gratuito");
  const [precio, setPrecio] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [verificandoAcceso, setVerificandoAcceso] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    async function verificarAcceso() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: puedeCrear, error } = await supabase.rpc(
        "mi_cuenta_puede_crear_planes"
      );

      if (error || puedeCrear !== true) {
        router.replace("/");
        return;
      }

      setAutorizado(true);
      setVerificandoAcceso(false);
    }

    verificarAcceso();
  }, [router]);

  function seleccionarArchivos(lista: FileList | null) {
    if (!lista) return;

    const nuevos = Array.from(lista);
    const permitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];

    if (nuevos.some((archivo) => !permitidos.includes(archivo.type))) {
      setMensaje("Hay archivos con formatos no permitidos.");
      return;
    }

    if (nuevos.some((archivo) => archivo.size > 50 * 1024 * 1024)) {
      setMensaje("Cada archivo puede pesar como máximo 50 MB.");
      return;
    }

    setArchivos((actuales) => [...actuales, ...nuevos]);
    setMensaje("");
  }

  async function crearPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");

    if (!autorizado || verificandoAcceso) {
      setMensaje("No tenés autorización para crear planes.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Escribí un nombre para el plan.");
      return;
    }

    if (archivos.length === 0) {
      setMensaje("Seleccioná al menos una foto o video.");
      return;
    }

    const precioNumerico = tipo === "pago" ? Number(precio) : 0;

    if (
      tipo === "pago" &&
      (
        !Number.isFinite(precioNumerico) ||
        precioNumerico <= 0 ||
        precioNumerico > 9999999999.99 ||
        !/^\d+(\.\d{1,2})?$/.test(precio.trim())
      )
    ) {
      setMensaje(
        "Ingresá un precio válido en pesos argentinos, con hasta dos decimales."
      );
      return;
    }

    setCargando(true);

    const supabase = createClient();
    let planId: string | null = null;
    const archivosSubidos: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Tenés que iniciar sesión.");
      }

      // Volver a comprobar la autorización antes de crear el plan.
      const { data: puedeCrear, error: verificacionError } =
        await supabase.rpc("mi_cuenta_puede_crear_planes");

      if (verificacionError || puedeCrear !== true) {
        throw new Error(
          "Tu cuenta no está autorizada para crear planes. Verificá el estado de tu cuenta."
        );
      }

      const { data: plan, error: planError } = await supabase
        .from("planes")
        .insert({
          user_id: user.id,
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          tipo,
          precio: Number(precioNumerico.toFixed(2)),
        })
        .select("id")
        .single();

      if (planError || !plan) {
        throw new Error(
          "No se pudo crear el plan: " + (planError?.message || "")
        );
      }

      planId = plan.id;

      const registros = [];

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];

        const extension = archivo.name.includes(".")
          ? archivo.name.substring(archivo.name.lastIndexOf("."))
          : "";

        const ruta = `${user.id}/planes/${plan.id}/${crypto.randomUUID()}${extension}`;

        const { error: subidaError } = await supabase.storage
          .from("Nubecita bucket")
          .upload(ruta, archivo, {
            contentType: archivo.type,
            upsert: false,
          });

        if (subidaError) {
          throw new Error(
            "No se pudo subir " + archivo.name + ": " + subidaError.message
          );
        }

        archivosSubidos.push(ruta);

        registros.push({
          plan_id: plan.id,
          file_path: ruta,
          mime_type: archivo.type,
          descripcion: archivo.name,
          posicion: i,
        });
      }

      const { error: registroError } = await supabase
        .from("plan_archivos")
        .insert(registros);

      if (registroError) {
        throw new Error(
          "No se pudieron guardar los archivos: " + registroError.message
        );
      }

      setMensaje("¡Plan creado correctamente!");
      setNombre("");
      setDescripcion("");
      setPrecio("");
      setTipo("gratuito");
      setArchivos([]);
      router.refresh();
    } catch (error) {
      if (archivosSubidos.length > 0) {
        await supabase.storage
          .from("Nubecita bucket")
          .remove(archivosSubidos);
      }

      if (planId) {
        await supabase.from("planes").delete().eq("id", planId);
      }

      setMensaje(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al crear el plan."
      );
    } finally {
      setCargando(false);
    }
  }

  if (verificandoAcceso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080D16] text-white">
        <p className="text-sky-200">Verificando acceso...</p>
      </main>
    );
  }

  if (!autorizado) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#080D16] px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-sky-200">
          Crear un plan exclusivo
        </h1>

        <p className="mb-8 text-sm text-gray-400">
          Creá un pack independiente de tus publicaciones.
        </p>

        <form onSubmit={crearPlan} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm text-sky-100">
              Nombre del plan
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pack exclusivo"
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-sky-300"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-sky-100">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contá qué incluye este plan..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-sky-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-sky-100">
              Tipo de plan
            </label>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#111827] p-3"
            >
              <option value="gratuito">Gratuito</option>
              <option value="pago">Pago</option>
            </select>
          </div>

          {tipo === "pago" && (
            <div>
              <label className="mb-2 block text-sm text-sky-100">
                Precio en pesos argentinos (ARS)
              </label>

              <input
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ingresá el precio"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none focus:border-sky-300"
              />

              <p className="mt-2 text-xs text-gray-400">
                El precio se cobrará en pesos argentinos (ARS).
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-sky-100">
              Fotos y videos exclusivos
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              multiple
              onChange={(e) => seleccionarArchivos(e.target.files)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            />

            <p className="mt-2 text-xs text-gray-400">
              Podés seleccionar varios archivos juntos. Máximo 50 MB por archivo.
            </p>

            {archivos.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-sky-200">
                  Archivos seleccionados: {archivos.length}
                </p>

                {archivos.map((archivo, indice) => (
                  <div
                    key={`${archivo.name}-${indice}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"
                  >
                    <span className="truncate text-sm text-gray-200">
                      {archivo.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setArchivos((actuales) =>
                          actuales.filter((_, i) => i !== indice)
                        )
                      }
                      className="shrink-0 text-sm text-red-300"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-sky-300 py-3 font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-50"
          >
            {cargando ? "Creando plan..." : "Crear plan"}
          </button>

          {mensaje && (
            <p className="rounded-xl bg-white/5 p-3 text-sm text-sky-200">
              {mensaje}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
