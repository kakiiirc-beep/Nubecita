"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ArchivoSeleccionado = {
  id: string;
  file: File;
  previewUrl: string;
  descripcion: string;
  tipo: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

function crearImagenRecortada(
  imageSrc: string,
  pixelCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        600,
        600
      );

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo crear la vista previa."));
        }
      }, "image/webp", 0.90);
    };

    image.onerror = () => reject(new Error("No se pudo abrir la imagen."));
  });
}

export default function SubirContenido() {
  const router = useRouter();
  const supabase = createClient();

  const [archivos, setArchivos] = useState<ArchivoSeleccionado[]>([]);
  const [archivoActivo, setArchivoActivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  function seleccionarArchivos(files: FileList | null) {
    if (!files) return;

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];

    const nuevos: ArchivoSeleccionado[] = [];

    for (const file of Array.from(files)) {
      if (!formatosPermitidos.includes(file.type)) {
        setMensaje(`Formato no permitido: ${file.name}`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        setMensaje(`${file.name} supera los 50 MB.`);
        continue;
      }

      nuevos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        descripcion: "",
        tipo: "publico",
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
      });
    }

    setArchivos((anteriores) => [...anteriores, ...nuevos]);
    setMensaje("");
  }

  function actualizarArchivo(
    id: string,
    cambios: Partial<ArchivoSeleccionado>
  ) {
    setArchivos((anteriores) =>
      anteriores.map((archivo) =>
        archivo.id === id ? { ...archivo, ...cambios } : archivo
      )
    );
  }

  function quitarArchivo(id: string) {
    setArchivos((anteriores) => {
      const archivo = anteriores.find((item) => item.id === id);

      if (archivo) {
        URL.revokeObjectURL(archivo.previewUrl);
      }

      const nuevos = anteriores.filter((item) => item.id !== id);

      setArchivoActivo((actual) =>
        Math.min(actual, Math.max(0, nuevos.length - 1))
      );

      return nuevos;
    });
  }

  async function subirArchivos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (archivos.length === 0) {
      setMensaje("Seleccioná al menos una foto o un video.");
      return;
    }

    setCargando(true);
    setMensaje("");

    let publicacionesGuardadas = 0;

    try {
      const {
        data: { user },
        error: usuarioError,
      } = await supabase.auth.getUser();

      if (usuarioError || !user) {
        router.push("/login");
        return;
      }

      for (const archivo of archivos) {
        let nombreArchivo = "";
        let previewPath: string | null = null;

        try {
          const extension = archivo.file.name
            .split(".")
            .pop()
            ?.toLowerCase();

          if (!extension) {
            throw new Error("El archivo no tiene una extensión válida.");
          }

          nombreArchivo = `${user.id}/${crypto.randomUUID()}.${extension}`;

          const { error: subidaError } = await supabase.storage
            .from("Nubecita bucket")
            .upload(nombreArchivo, archivo.file);

          if (subidaError) {
            throw new Error(subidaError.message);
          }

          // Crear una vista previa recortada.
          // El archivo original permanece intacto.
          if (
            archivo.file.type.startsWith("image/") &&
            archivo.file.type !== "image/gif" &&
            archivo.croppedAreaPixels
          ) {
            const blob = await crearImagenRecortada(
              archivo.previewUrl,
              archivo.croppedAreaPixels
            );

            previewPath = `${user.id}/previews/${crypto.randomUUID()}.webp`;

            const { error: previewError } = await supabase.storage
              .from("Nubecita bucket")
              .upload(previewPath, blob, {
                contentType: "image/webp",
              });

            if (previewError) {
              throw new Error(previewError.message);
            }
          }

          const { error: registroError } = await supabase
            .from("publicaciones")
            .insert({
              user_id: user.id,
              file_path: nombreArchivo,
              preview_path: previewPath,
              description: archivo.descripcion,
              mime_type: archivo.file.type,
              visibility: archivo.tipo,
            });

          if (registroError) {
            throw new Error(registroError.message);
          }

          publicacionesGuardadas++;
        } catch (error) {
          const rutas = [nombreArchivo, previewPath].filter(
            (ruta): ruta is string => Boolean(ruta)
          );

          if (rutas.length > 0) {
            await supabase.storage
              .from("Nubecita bucket")
              .remove(rutas);
          }

          throw new Error(
            `Error con ${archivo.file.name}: ${
              error instanceof Error ? error.message : "Error desconocido"
            }`
          );
        }
      }

            // Limpiar las vistas previas de los archivos.
      archivos.forEach((archivo) => {
        URL.revokeObjectURL(archivo.previewUrl);
      });

      setArchivos([]);
      setArchivoActivo(0);

      // Buscar el username para redirigir al perfil público.
      const { data: perfil, error: perfilError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (perfilError || !perfil?.username) {
        setMensaje(
          "Las publicaciones se guardaron, pero no se pudo abrir tu perfil."
        );
        return;
      }

      router.push(`/perfil/${perfil.username}`);
    } catch (error) {
      setMensaje(
        `${publicacionesGuardadas} publicaciones guardadas. ${
          error instanceof Error ? error.message : "Ocurrió un error."
        }`
      );
    } finally {
      setCargando(false);
    }
  }

  const activo = archivos[archivoActivo];

  return (
    <main className="min-h-screen bg-[#0b080d] px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-sky-200">
          ← Volver a NUBECITA
        </a>

        <h1 className="mt-8 text-3xl font-bold">
          Subir contenido
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          Seleccioná varias fotos o videos y configurá cada publicación.
        </p>

        <form
          onSubmit={subirArchivos}
          className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-[#151019] p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Seleccioná tus fotos y videos
            </label>

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              onChange={(e) => seleccionarArchivos(e.target.files)}
              className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm"
            />

            <p className="mt-2 text-xs text-gray-400">
              Podés seleccionar varios archivos. Máximo 50 MB por archivo.
            </p>
          </div>

          {archivos.length > 0 && (
            <>
              <div className="space-y-4">
                <h2 className="font-semibold text-sky-200">
                  Tus publicaciones ({archivos.length})
                </h2>

                {archivos.map((archivo, indice) => (
                  <div
                    key={archivo.id}
                    className={`rounded-xl border p-4 ${
                      archivoActivo === indice
                        ? "border-sky-200"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {archivo.file.type.startsWith("image/") ? (
                        <img
                          src={archivo.previewUrl}
                          alt=""
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <video
                          src={archivo.previewUrl}
                          className="h-20 w-20 rounded-lg bg-black object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm">
                          {archivo.file.name}
                        </p>

                        <button
                          type="button"
                          onClick={() => setArchivoActivo(indice)}
                          className="mt-2 text-sm text-sky-200 underline"
                        >
                          Configurar publicación
                        </button>

                        <button
                          type="button"
                          onClick={() => quitarArchivo(archivo.id)}
                          className="ml-4 text-sm text-red-300 underline"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-300">
                          Descripción
                        </label>

                        <textarea
                          value={archivo.descripcion}
                          onChange={(e) =>
                            actualizarArchivo(archivo.id, {
                              descripcion: e.target.value,
                            })
                          }
                          placeholder="Escribí algo sobre esta publicación..."
                          className="min-h-20 w-full rounded-xl border border-white/10 bg-black p-3 text-sm outline-none focus:border-sky-200"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-300">
                          Visibilidad
                        </label>

                        <select
                          value={archivo.tipo}
                          onChange={(e) =>
                            actualizarArchivo(archivo.id, {
                              tipo: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-black p-3 text-sm"
                        >
                          <option value="publico">Pública</option>
                          <option value="privado">Privada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activo &&
                activo.file.type.startsWith("image/") &&
                activo.file.type !== "image/gif" && (
                  <div className="space-y-4 rounded-xl border border-sky-200/30 p-4">
                    <h2 className="font-semibold text-sky-200">
                      Ajustar recorte de la foto
                    </h2>

                    <p className="text-xs text-gray-400">
                      Elegí qué parte se verá en la galería. La imagen
                      original no se modifica.
                    </p>

                    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl bg-black">
                      <Cropper
                        image={activo.previewUrl}
                        crop={activo.crop}
                        zoom={activo.zoom}
                        aspect={1}
                        onCropChange={(crop) =>
                          actualizarArchivo(activo.id, { crop })
                        }
                        onZoomChange={(zoom) =>
                          actualizarArchivo(activo.id, { zoom })
                        }
                        onCropComplete={(_, croppedAreaPixels) =>
                          actualizarArchivo(activo.id, {
                            croppedAreaPixels,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm">
                        Acercar o alejar
                      </label>

                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={activo.zoom}
                        onChange={(e) =>
                          actualizarArchivo(activo.id, {
                            zoom: Number(e.target.value),
                          })
                        }
                        className="w-full accent-sky-200"
                      />
                    </div>
                  </div>
                )}

              {activo?.file.type === "image/gif" && (
                <p className="text-xs text-gray-400">
                  Los GIF se publican sin recorte para conservar su animación.
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-xl bg-sky-200 py-3 font-bold text-black transition hover:bg-sky-100 disabled:opacity-50"
              >
                {cargando ? "Publicando..." : "Publicar contenido"}
              </button>
            </>
          )}

          {mensaje && (
            <p className="text-center text-sm text-sky-200">
              {mensaje}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}