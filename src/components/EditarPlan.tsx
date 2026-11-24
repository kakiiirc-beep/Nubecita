
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";

type Props = {
  planId: string;
  userId: string;
};

type ArchivoPlan = {
  id: string;
  file_path: string;
  descripcion: string;
  mime_type: string;
  disponible: boolean;
  posicion: number;
  url: string | null;
};

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

function crearImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

async function recortarPortada(
  imagenUrl: string,
  area: Area
): Promise<Blob> {
  const imagen = await crearImagen(imagenUrl);
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("No se pudo procesar la portada.");
  }

  canvas.width = area.width;
  canvas.height = area.height;

  contexto.drawImage(
    imagen,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo generar la portada."));
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function EditarPlan({ planId, userId }: Props) {
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("gratuito");
  const [precio, setPrecio] = useState("");

  const [portadaActual, setPortadaActual] = useState<string | null>(null);
  const [rutaPortadaActual, setRutaPortadaActual] = useState<string | null>(
    null
  );

  const [imagenRecorte, setImagenRecorte] = useState<string | null>(null);
  const [areaRecorte, setAreaRecorte] = useState<Area | null>(null);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [portadaBlob, setPortadaBlob] = useState<Blob | null>(null);

  const [archivosActuales, setArchivosActuales] = useState<ArchivoPlan[]>([]);
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [archivosRetirados, setArchivosRetirados] = useState<string[]>([]);

  const [valoresIniciales, setValoresIniciales] = useState({
    nombre: "",
    descripcion: "",
    tipo: "gratuito",
    precio: "",
    portada: null as string | null,
  });

  const alCompletarRecorte = useCallback(
    (_area: Area, areaPixels: Area) => {
      setAreaRecorte(areaPixels);
    },
    []
  );

  function limpiarRecorte() {
    if (imagenRecorte) {
      URL.revokeObjectURL(imagenRecorte);
    }

    setImagenRecorte(null);
    setAreaRecorte(null);
    setZoom(1);
    setPosicion({ x: 0, y: 0 });
  }

  useEffect(() => {
    return () => {
      if (imagenRecorte) URL.revokeObjectURL(imagenRecorte);
    };
  }, [imagenRecorte]);

  async function cargarPlan() {
    setCargando(true);
    setMensaje("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error("No tenés permiso para editar este plan.");
      }

      const { data: plan, error: planError } = await supabase
        .from("planes")
        .select("id, user_id, nombre, descripcion, tipo, precio, portada_path")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();

      if (planError || !plan) {
        throw new Error("No pudimos cargar el plan.");
      }

      const { data: archivos, error: archivosError } = await supabase
        .from("plan_archivos")
        .select("id, file_path, descripcion, mime_type, disponible, posicion")
        .eq("plan_id", planId)
        .eq("disponible", true)
        .order("posicion", { ascending: true });

      if (archivosError) throw archivosError;

      const archivosConUrl = await Promise.all(
        (archivos || []).map(async (archivo) => {
          const { data, error } = await supabase.storage
            .from("Nubecita bucket")
            .createSignedUrl(archivo.file_path, 3600);

          return {
            ...archivo,
            url: error ? null : data.signedUrl,
          };
        })
      );

      let portadaUrl: string | null = null;

      if (plan.portada_path) {
        const { data, error } = await supabase.storage
          .from("Nubecita bucket")
          .createSignedUrl(plan.portada_path, 3600);

        if (!error && data) portadaUrl = data.signedUrl;
      }

      setNombre(plan.nombre || "");
      setDescripcion(plan.descripcion || "");
      setTipo(plan.tipo || "gratuito");
      setPrecio(
        plan.tipo === "pago" ? String(plan.precio ?? "") : ""
      );

      setPortadaActual(portadaUrl);
      setRutaPortadaActual(plan.portada_path);

      setArchivosActuales(archivosConUrl);
      setArchivosNuevos([]);
      setArchivosRetirados([]);

      setValoresIniciales({
        nombre: plan.nombre || "",
        descripcion: plan.descripcion || "",
        tipo: plan.tipo || "gratuito",
        precio: plan.tipo === "pago" ? String(plan.precio ?? "") : "",
        portada: plan.portada_path,
      });
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al cargar el plan."
      );
    } finally {
      setCargando(false);
    }
  }

  async function abrirEditor() {
    setAbierto(true);
    await cargarPlan();
  }

  function seleccionarPortada(archivo: File | undefined) {
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setMensaje("La portada debe ser JPG, PNG o WEBP.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      setMensaje("La portada no puede superar los 8 MB.");
      return;
    }

    limpiarRecorte();
    setPortadaBlob(null);
    setImagenRecorte(URL.createObjectURL(archivo));
    setAreaRecorte(null);
    setMensaje("");
  }

  async function confirmarRecorte() {
    if (!imagenRecorte || !areaRecorte) {
      setMensaje("Acomodá la imagen antes de continuar.");
      return;
    }

    try {
      const blob = await recortarPortada(imagenRecorte, areaRecorte);
      setPortadaBlob(blob);

      const urlAnterior = portadaActual;
      const nuevaUrl = URL.createObjectURL(blob);

      setPortadaActual(nuevaUrl);

      if (urlAnterior?.startsWith("blob:")) {
        URL.revokeObjectURL(urlAnterior);
      }

      limpiarRecorte();
      setMensaje("Portada preparada. Recordá guardar los cambios.");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo recortar la portada."
      );
    }
  }

  function seleccionarArchivos(lista: FileList | null) {
    if (!lista) return;

    const nuevos = Array.from(lista);

    if (nuevos.some((archivo) => !FORMATOS_PERMITIDOS.includes(archivo.type))) {
      setMensaje("Hay archivos con formatos no permitidos.");
      return;
    }

    if (nuevos.some((archivo) => archivo.size > 50 * 1024 * 1024)) {
      setMensaje("Cada archivo puede pesar como máximo 50 MB.");
      return;
    }

    setArchivosNuevos((actuales) => [...actuales, ...nuevos]);
    setMensaje("");
  }

  function retirarArchivo(id: string) {
    setArchivosRetirados((actuales) => [...actuales, id]);
  }

  async function guardarCambios(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");

    if (!nombre.trim()) {
      setMensaje("Escribí un nombre para el plan.");
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

    setGuardando(true);

    const supabase = createClient();
    const rutasSubidas: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error("No tenés permiso para editar este plan.");
      }

      const { data: planPropio, error: consultaError } = await supabase
        .from("planes")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();

      if (consultaError || !planPropio) {
        throw new Error("No pudimos verificar que el plan sea tuyo.");
      }

      let nuevaRutaPortada = rutaPortadaActual;

      if (portadaBlob) {
        const ruta = `${user.id}/planes/${planId}/portada-${crypto.randomUUID()}.jpg`;

        const { error: subidaError } = await supabase.storage
          .from("Nubecita bucket")
          .upload(ruta, portadaBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (subidaError) throw subidaError;

        rutasSubidas.push(ruta);
        nuevaRutaPortada = ruta;
      }

      const { error: actualizacionError } = await supabase
        .from("planes")
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          tipo,
          precio: Number(precioNumerico.toFixed(2)),
          portada_path: nuevaRutaPortada,
        })
        .eq("id", planId)
        .eq("user_id", user.id);

      if (actualizacionError) throw actualizacionError;

      if (archivosRetirados.length > 0) {
        const { error: retiroError } = await supabase
          .from("plan_archivos")
          .update({ disponible: false })
          .eq("plan_id", planId)
          .in("id", archivosRetirados);

        if (retiroError) throw retiroError;
      }

      if (archivosNuevos.length > 0) {
        const registros = [];

        for (let i = 0; i < archivosNuevos.length; i++) {
          const archivo = archivosNuevos[i];

          const extension = archivo.name.includes(".")
            ? archivo.name.substring(archivo.name.lastIndexOf("."))
            : "";

          const ruta = `${user.id}/planes/${planId}/${crypto.randomUUID()}${extension}`;

          const { error: subidaError } = await supabase.storage
            .from("Nubecita bucket")
            .upload(ruta, archivo, {
              contentType: archivo.type,
              upsert: false,
            });

          if (subidaError) throw subidaError;

          rutasSubidas.push(ruta);

          registros.push({
            plan_id: planId,
            file_path: ruta,
            mime_type: archivo.type,
            descripcion: archivo.name,
            posicion: archivosActuales.length + i,
            disponible: true,
          });
        }

        const { error: registroError } = await supabase
          .from("plan_archivos")
          .insert(registros);

        if (registroError) throw registroError;
      }

      limpiarRecorte();

      setMensaje("¡Plan actualizado correctamente!");
      setPortadaBlob(null);
      setArchivosNuevos([]);
      setArchivosRetirados([]);

      await cargarPlan();
      router.refresh();
    } catch (error) {
      if (rutasSubidas.length > 0) {
        await supabase.storage
          .from("Nubecita bucket")
          .remove(rutasSubidas);
      }

      setMensaje(
        error instanceof Error
          ? "No se pudieron guardar todos los cambios: " + error.message
          : "Ocurrió un error al editar el plan."
      );
    } finally {
      setGuardando(false);
    }
  }

  function cerrarEditor() {
    if (guardando) return;

    limpiarRecorte();

    if (portadaActual?.startsWith("blob:")) {
      URL.revokeObjectURL(portadaActual);
    }

    setAbierto(false);
    setMensaje("");
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirEditor}
        className="w-full rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-500/20"
      >
        Editar plan
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-sky-950/30 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarEditor();
          }}
        >
          <div className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-sky-200 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-sky-700">
                Editar plan
              </h2>

              <button
                type="button"
                onClick={cerrarEditor}
                disabled={guardando}
                className="text-2xl text-slate-500 hover:text-sky-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {cargando ? (
              <p className="py-12 text-center text-slate-600">
                Cargando plan...
              </p>
            ) : (
              <form onSubmit={guardarCambios} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Nombre del plan
                  </label>

                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={100}
                    required
                    className="w-full rounded-xl border border-sky-200 bg-white p-3 outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Descripción
                  </label>

                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full rounded-xl border border-sky-200 bg-white p-3 outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tipo de plan
                  </label>

                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-sky-200 bg-white p-3"
                  >
                    <option value="gratuito">Gratuito</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                {tipo === "pago" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Precio en pesos argentinos (ARS)
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      max="9999999999.99"
                      step="0.01"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      required
                      className="w-full rounded-xl border border-sky-200 bg-white p-3"
                    />
                  </div>
                )}

                <div className="border-t border-sky-100 pt-5">
                  <h3 className="mb-3 font-semibold text-sky-800">
                    Portada del plan
                  </h3>

                  {portadaActual ? (
                    <img
                      src={portadaActual}
                      alt="Portada del plan"
                      className="mb-3 h-36 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <p className="mb-3 text-sm text-slate-500">
                      Este plan todavía no tiene una portada.
                    </p>
                  )}

                  <label className="block cursor-pointer rounded-xl border border-sky-200 bg-sky-50 p-3 text-center text-sm font-semibold text-sky-800 hover:bg-sky-100">
                    Seleccionar o cambiar portada
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        seleccionarPortada(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG o WEBP. Máximo 8 MB. Podés acomodar la imagen antes de guardarla.
                  </p>
                </div>

                <div className="border-t border-sky-100 pt-5">
                  <h3 className="mb-3 font-semibold text-sky-800">
                    Archivos actuales
                  </h3>

                  {archivosActuales.filter(
                    (archivo) => !archivosRetirados.includes(archivo.id)
                  ).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No quedan archivos disponibles en este plan.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {archivosActuales
                        .filter(
                          (archivo) =>
                            !archivosRetirados.includes(archivo.id)
                        )
                        .map((archivo) => (
                          <div
                            key={archivo.id}
                            className="flex items-center gap-3 rounded-xl border border-sky-100 p-3"
                          >
                            {archivo.url &&
                            archivo.mime_type.startsWith("image/") ? (
                              <img
                                src={archivo.url}
                                alt=""
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-sky-100 text-2xl">
                                🎬
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {archivo.descripcion || "Archivo"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {archivo.mime_type.startsWith("image/")
                                  ? "Imagen"
                                  : "Video"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => retirarArchivo(archivo.id)}
                              className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800"
                            >
                              Retirar
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {archivosRetirados.length > 0 && (
                    <p className="mt-3 text-xs text-amber-700">
                      {archivosRetirados.length} archivo(s) se retirarán al guardar. No se borrarán del almacenamiento.
                    </p>
                  )}
                </div>

                <div className="border-t border-sky-100 pt-5">
                  <h3 className="mb-3 font-semibold text-sky-800">
                    Agregar fotos y videos
                  </h3>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    multiple
                    onChange={(e) => {
                      seleccionarArchivos(e.target.files);
                      e.target.value = "";
                    }}
                    className="w-full rounded-xl border border-sky-200 bg-white p-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Máximo 50 MB por archivo.
                  </p>

                  {archivosNuevos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-sky-800">
                        Nuevos archivos: {archivosNuevos.length}
                      </p>

                      {archivosNuevos.map((archivo, indice) => (
                        <div
                          key={`${archivo.name}-${indice}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-sky-50 p-3"
                        >
                          <span className="truncate text-sm">
                            {archivo.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setArchivosNuevos((actuales) =>
                                actuales.filter((_, i) => i !== indice)
                              )
                            }
                            className="shrink-0 text-sm text-red-600"
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
                  disabled={guardando}
                  className="w-full rounded-xl bg-sky-500 py-3 font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
                >
                  {guardando ? "Guardando cambios..." : "GUARDAR CAMBIOS"}
                </button>

                {mensaje && (
                  <p className="rounded-xl bg-sky-50 p-3 text-center text-sm text-sky-800">
                    {mensaje}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {imagenRecorte && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <h2 className="mb-4 text-center text-xl font-bold text-sky-700">
              Acomodá la portada
            </h2>

            <div className="relative mx-auto h-52 w-full overflow-hidden rounded-xl bg-black">
              <Cropper
                image={imagenRecorte}
                crop={posicion}
                zoom={zoom}
                aspect={16 / 5}
                cropShape="rect"
                showGrid={false}
                onCropChange={setPosicion}
                onZoomChange={setZoom}
                onCropComplete={alCompletarRecorte}
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm">
                Zoom
              </label>

              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={limpiarRecorte}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarRecorte}
                disabled={!areaRecorte}
                className="flex-1 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Confirmar recorte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
