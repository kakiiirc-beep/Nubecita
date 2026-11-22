
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  esPropietario: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
};

type TipoFoto = "avatar" | "cover";

function crearImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

async function recortarImagen(
  imagenUrl: string,
  area: Area
): Promise<Blob> {
  const imagen = await crearImagen(imagenUrl);
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("No se pudo procesar la imagen.");
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
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen."));
    }, "image/jpeg", 0.92);
  });
}

export default function FotosPerfil({
  userId,
  esPropietario,
  avatarUrl,
  coverUrl,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [menu, setMenu] = useState<TipoFoto | null>(null);
  const [fotoVista, setFotoVista] = useState<string | null>(null);
  const [tipoFotoVista, setTipoFotoVista] = useState<TipoFoto | null>(null);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("nubecita:visor-foto", {
        detail: Boolean(fotoVista),
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("nubecita:visor-foto", {
          detail: false,
        })
      );
    };
  }, [fotoVista]);

  const [avatarActual, setAvatarActual] = useState(avatarUrl);
  const [portadaActual, setPortadaActual] = useState(coverUrl);

  const [subiendo, setSubiendo] = useState(false);

  function setMensaje(mensaje: string) {
    window.dispatchEvent(
      new CustomEvent("nubecita:foto-mensaje", {
        detail: mensaje,
      })
    );
  }

  const [imagenRecorte, setImagenRecorte] = useState<string | null>(null);
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [tipoRecorte, setTipoRecorte] = useState<TipoFoto | null>(null);

  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaRecorte, setAreaRecorte] = useState<Area | null>(null);

  const alCompletarRecorte = useCallback(
    (_area: Area, areaPixels: Area) => {
      setAreaRecorte(areaPixels);
    },
    []
  );

  function cancelarRecorte() {
    if (imagenRecorte) {
      URL.revokeObjectURL(imagenRecorte);
    }

    setImagenRecorte(null);
    setArchivoOriginal(null);
    setTipoRecorte(null);
    setAreaRecorte(null);
  }

  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setFotoVista(null);

        if (imagenRecorte && !subiendo) {
          cancelarRecorte();
        }
      }
    }

    window.addEventListener("keydown", manejarEscape);

    return () => {
      window.removeEventListener("keydown", manejarEscape);
    };
  }, [imagenRecorte, subiendo]);

  function seleccionarFoto(archivo: File, tipo: TipoFoto) {
    if (!archivo.type.startsWith("image/")) {
      setMensaje("Elegí un archivo de imagen.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      setMensaje("La imagen no puede superar los 8 MB.");
      return;
    }

    const url = URL.createObjectURL(archivo);

    setArchivoOriginal(archivo);
    setImagenRecorte(url);
    setTipoRecorte(tipo);
    setPosicion({ x: 0, y: 0 });
    setZoom(1);
    setAreaRecorte(null);
    setMenu(null);
    setMensaje("");
  }

  async function verFotoPerfil() {
    setMenu(null);
    setTipoFotoVista("avatar");

    const { data, error } = await supabase.storage
      .from("Nubecita bucket")
      .createSignedUrl(`profile-media/${userId}/avatar-original`, 3600);

    if (!error && data) {
      setFotoVista(data.signedUrl);
    } else if (avatarActual) {
      setFotoVista(avatarActual);
    }
  }

  async function verFotoPortada() {
    setMenu(null);
    setTipoFotoVista("cover");

    const { data, error } = await supabase.storage
      .from("Nubecita bucket")
      .createSignedUrl(`profile-media/${userId}/cover-original`, 3600);

    if (!error && data) {
      setFotoVista(data.signedUrl);
    } else if (portadaActual) {
      setFotoVista(portadaActual);
    }
  }

  async function guardarFoto() {
    if (!imagenRecorte || !areaRecorte || !archivoOriginal || !tipoRecorte) {
      setMensaje("Acomodá la imagen antes de guardarla.");
      return;
    }

    setSubiendo(true);
    setMensaje("Subiendo...");

    const tipo = tipoRecorte;
    const campo = tipo === "avatar" ? "avatar_url" : "cover_path";
    const carpetaPropia = `profile-media/${userId}/`;

    try {
      const { data: perfilAnterior, error: errorConsulta } = await supabase
        .from("profiles")
        .select("avatar_url, cover_path")
        .eq("id", userId)
        .single();

      if (errorConsulta) throw errorConsulta;

      const rutaAnterior =
        tipo === "avatar"
          ? perfilAnterior.avatar_url
          : perfilAnterior.cover_path;

      const blob = await recortarImagen(imagenRecorte, areaRecorte);
      const ruta = `${carpetaPropia}${tipo}-${Date.now()}.jpg`;

      const { error: errorSubida } = await supabase.storage
        .from("Nubecita bucket")
        .upload(ruta, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (errorSubida) throw errorSubida;

      const { data: urlData, error: errorUrl } = await supabase.storage
        .from("Nubecita bucket")
        .createSignedUrl(ruta, 3600);

      if (errorUrl || !urlData) {
        await supabase.storage.from("Nubecita bucket").remove([ruta]);
        throw new Error("No pudimos preparar la nueva foto para mostrarla.");
      }

      const { error: errorActualizacion } = await supabase
        .from("profiles")
        .update({ [campo]: ruta })
        .eq("id", userId);

      if (errorActualizacion) {
        await supabase.storage.from("Nubecita bucket").remove([ruta]);
        throw errorActualizacion;
      }

      if (tipo === "avatar") {
        setAvatarActual(urlData.signedUrl);
      } else {
        setPortadaActual(urlData.signedUrl);
      }

      const nombreOriginal =
        tipo === "avatar" ? "avatar-original" : "cover-original";

      const { error: errorOriginal } = await supabase.storage
        .from("Nubecita bucket")
        .upload(
          `${carpetaPropia}${nombreOriginal}`,
          archivoOriginal,
          {
            contentType: archivoOriginal.type,
            upsert: true,
          }
        );

      let aviso = "";

      if (
        rutaAnterior &&
        rutaAnterior.startsWith(carpetaPropia) &&
        rutaAnterior !== ruta
      ) {
        const { error: errorBorrado } = await supabase.storage
          .from("Nubecita bucket")
          .remove([rutaAnterior]);

        if (errorBorrado) {
          aviso = " La foto anterior no pudo eliminarse del almacenamiento.";
        }
      }

      if (errorOriginal) {
        aviso += " La foto nueva se guardó, pero no se pudo actualizar el archivo original.";
      }

      cancelarRecorte();

      setMensaje("Foto subida correctamente." + aviso);

      setTimeout(() => setMensaje(""), 5000);
      router.refresh();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? "No pudimos guardar la foto: " + error.message
          : "Ocurrió un error al guardar la foto."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarFoto() {
    if (!tipoFotoVista || !esPropietario) return;

    const confirmar = window.confirm(
      "¿Estás seguro de que querés borrar esta foto?"
    );

    if (!confirmar) return;

    setSubiendo(true);
    setMensaje("");

    try {
      const { data: perfil, error: errorPerfil } = await supabase
        .from("profiles")
        .select("avatar_url, cover_path")
        .eq("id", userId)
        .single();

      if (errorPerfil) throw errorPerfil;

      const rutas =
        tipoFotoVista === "avatar"
          ? [
              perfil.avatar_url,
              `profile-media/${userId}/avatar-original`,
            ].filter((ruta): ruta is string => Boolean(ruta))
          : [
              perfil.cover_path,
              `profile-media/${userId}/cover-original`,
            ].filter((ruta): ruta is string => Boolean(ruta));

      if (rutas.length > 0) {
        const { error } = await supabase.storage
          .from("Nubecita bucket")
          .remove(rutas);

        if (error) throw error;
      }

      const actualizacion =
        tipoFotoVista === "avatar"
          ? { avatar_url: null }
          : { cover_path: null };

      const { error: errorActualizacion } = await supabase
        .from("profiles")
        .update(actualizacion)
        .eq("id", userId);

      if (errorActualizacion) throw errorActualizacion;

      if (tipoFotoVista === "avatar") {
        setAvatarActual(null);
      } else {
        setPortadaActual(null);
      }

      setFotoVista(null);
      setTipoFotoVista(null);
      setMensaje("¡Foto borrada correctamente!");
      setTimeout(() => setMensaje(""), 3000);
      router.refresh();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? "No pudimos borrar la foto: " + error.message
          : "Ocurrió un error al borrar la foto."
      );
    } finally {
      setSubiendo(false);
    }
  }

  function abrirArchivo(tipo: TipoFoto) {
    if (tipo === "avatar") {
      avatarInput.current?.click();
    } else {
      coverInput.current?.click();
    }
  }

  return (
    <div className="relative">
      {menu && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setMenu(null)}
        />
      )}

      {/* PORTADA */}
      <div
        onClick={() => setMenu(menu === "cover" ? null : "cover")}
        className={`relative h-40 cursor-pointer overflow-hidden rounded-2xl sm:h-64 ${
          portadaActual ? "bg-sky-100" : "bg-[#eaf8ff]"
        }`}
      >
        {portadaActual ? (
          <img
            src={portadaActual}
            alt="Foto de portada"
            className="h-full w-full object-cover"
          />
        ) : (
          esPropietario && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenu("cover");
              }}
              className="absolute inset-0 flex w-full items-center justify-center text-lg font-semibold text-sky-700 transition hover:bg-sky-100/60"
            >
              Agregar foto
            </button>
          )
        )}
      </div>

      {menu === "cover" && (
        <div className="absolute right-3 top-3 z-30 w-44 rounded-xl border border-sky-200 bg-sky-100 p-2 text-black shadow-xl">
          {portadaActual && (
            <button
              onClick={verFotoPortada}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-black transition hover:bg-sky-200"
            >
              Ver foto
            </button>
          )}

          {esPropietario && (
            <button
              onClick={() => abrirArchivo("cover")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-black transition hover:bg-sky-200"
            >
              {portadaActual ? "Cambiar foto" : "Subir foto"}
            </button>
          )}
        </div>
      )}

      {/* FOTO DE PERFIL */}
      <div className="absolute bottom-[-3.5rem] left-4 z-40 sm:bottom-[-4.5rem] sm:left-8">
        <div className="relative h-28 w-28 sm:h-36 sm:w-36">
          <button
            type="button"
            onClick={() => setMenu(menu === "avatar" ? null : "avatar")}
            className="h-full w-full overflow-hidden rounded-full border-4 border-sky-200 bg-[#eaf8ff] shadow-xl"
          >
            {avatarActual ? (
              <img
                src={avatarActual}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#eaf8ff] text-4xl">
                ☁️
              </span>
            )}
          </button>

          {esPropietario && !avatarActual && (
            <button
              type="button"
              onClick={() => setMenu(menu === "avatar" ? null : "avatar")}
              className="absolute bottom-1 right-1 rounded-full bg-sky-500 px-2 py-1 text-xs text-white hover:bg-sky-400"
              aria-label="Subir foto de perfil"
            >
              📤
            </button>
          )}

          {menu === "avatar" && (
            <div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-xl border border-sky-200 bg-sky-100 p-2 text-black shadow-xl">
              {avatarActual && (
                <button
                  onClick={verFotoPerfil}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-black transition hover:bg-sky-200"
                >
                  Ver foto
                </button>
              )}

              {esPropietario && (
                <button
                  onClick={() => abrirArchivo("avatar")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-black transition hover:bg-sky-200"
                >
                  {avatarActual ? "Cambiar foto" : "Subir foto"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={avatarInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) seleccionarFoto(archivo, "avatar");
          e.target.value = "";
        }}
      />

      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) seleccionarFoto(archivo, "cover");
          e.target.value = "";
        }}
      />

      {/* RECORTE DE IMAGEN */}
      {imagenRecorte && tipoRecorte && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4"
          onClick={() => {
            if (!subiendo) cancelarRecorte();
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1b1420] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-center text-xl font-bold text-white">
              {tipoRecorte === "avatar"
                ? "Ajustá tu foto de perfil"
                : "Ajustá tu foto de portada"}
            </h2>

            <p className="mb-4 text-center text-sm text-gray-400">
              {tipoRecorte === "avatar"
                ? "Mové la imagen y ajustá el zoom para elegir cómo se verá en tu círculo."
                : "Mové la imagen y ajustá el zoom para elegir cómo se verá en tu portada."}
            </p>

            <div
              className={`relative mx-auto w-full overflow-hidden rounded-xl bg-black ${
                tipoRecorte === "avatar" ? "h-72" : "h-52"
              }`}
            >
              <Cropper
                image={imagenRecorte}
                crop={posicion}
                zoom={zoom}
                aspect={tipoRecorte === "avatar" ? 1 : 16 / 5}
                cropShape={tipoRecorte === "avatar" ? "round" : "rect"}
                showGrid={false}
                onCropChange={setPosicion}
                onZoomChange={setZoom}
                onCropComplete={alCompletarRecorte}
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-gray-300">
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

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={subiendo}
                onClick={cancelarRecorte}
                className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={subiendo || !areaRecorte}
                onClick={guardarFoto}
                className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
              >
                {subiendo ? "Guardando..." : "Guardar foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOTO AMPLIADA */}
      {fotoVista && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-5"
          onClick={() => {
            setFotoVista(null);
            setTipoFotoVista(null);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setFotoVista(null);
              setTipoFotoVista(null);
            }}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-4 py-2 text-white"
          >
            ✕ Cerrar
          </button>

          <img
            src={fotoVista}
            alt="Foto ampliada"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {esPropietario && (
            <button
              type="button"
              disabled={subiendo}
              onClick={(e) => {
                e.stopPropagation();
                borrarFoto();
              }}
              className="absolute bottom-5 right-5 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {subiendo ? "Borrando..." : "🗑️ Borrar foto"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
