"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  esPropietario: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
};

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

  const [menu, setMenu] = useState<"avatar" | "cover" | null>(null);
  const [fotoVista, setFotoVista] = useState<string | null>(null);
  const [avatarActual, setAvatarActual] = useState(avatarUrl);
  const [portadaActual, setPortadaActual] = useState(coverUrl);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function subirFoto(
    archivo: File,
    tipo: "avatar" | "cover"
  ) {
    if (!archivo.type.startsWith("image/")) {
      setMensaje("Elegí un archivo de imagen.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      setMensaje("La imagen no puede superar los 8 MB.");
      return;
    }

    setSubiendo(true);
    setMensaje("");

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const ruta = `profile-media/${userId}/${tipo}-${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("Nubecita bucket")
      .upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false,
      });

    if (errorSubida) {
      setMensaje("No pudimos subir la imagen: " + errorSubida.message);
      setSubiendo(false);
      return;
    }

    const columna = tipo === "avatar" ? "avatar_url" : "cover_path";

    const { error: errorPerfil } = await supabase
      .from("profiles")
      .update({ [columna]: ruta })
      .eq("id", userId);

    if (errorPerfil) {
      setMensaje("La imagen se subió, pero no pudimos guardar el perfil: " + errorPerfil.message);
      setSubiendo(false);
      return;
    }

    const { data: urlData, error: errorUrl } = await supabase.storage
      .from("Nubecita bucket")
      .createSignedUrl(ruta, 3600);

    if (errorUrl || !urlData) {
      setMensaje("La imagen se guardó, pero no pudimos mostrarla todavía.");
      setSubiendo(false);
      router.refresh();
      return;
    }

    if (tipo === "avatar") {
      setAvatarActual(urlData.signedUrl);
    } else {
      setPortadaActual(urlData.signedUrl);
    }

    setMenu(null);
    setSubiendo(false);
    setMensaje("¡Foto actualizada correctamente!");
    router.refresh();
  }

  function abrirArchivo(tipo: "avatar" | "cover") {
    if (tipo === "avatar") {
      avatarInput.current?.click();
    } else {
      coverInput.current?.click();
    }
  }

  return (
    <div className="relative">
      <div
        onClick={() => setMenu(menu === "cover" ? null : "cover")}
        className="relative h-40 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-[#4b1235] via-[#24101f] to-[#100b17] sm:h-64"
      >
        {portadaActual && (
          <img
            src={portadaActual}
            alt="Foto de portada"
            className="h-full w-full object-cover"
          />
        )}

        {esPropietario && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white">
            📷 Foto de portada
          </span>
        )}
      </div>

      {menu === "cover" && (
        <div className="absolute right-3 top-3 z-30 w-44 rounded-xl border border-white/10 bg-[#24121b] p-2 shadow-xl">
          {portadaActual && (
            <button
              onClick={() => {
                setFotoVista(portadaActual);
                setMenu(null);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              👁️ Ver foto
            </button>
          )}

          {esPropietario && (
            <button
              onClick={() => abrirArchivo("cover")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              📤 Subir foto
            </button>
          )}
        </div>
      )}

      <div className="relative -mt-14 px-4 sm:-mt-16 sm:px-8">
        <div className="relative h-28 w-28 sm:h-36 sm:w-36">
          <button
            type="button"
            onClick={() => setMenu(menu === "avatar" ? null : "avatar")}
            className="h-full w-full overflow-hidden rounded-full border-4 border-[#0b080d] bg-[#24121b] shadow-xl"
          >
            {avatarActual ? (
              <img
                src={avatarActual}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-black text-4xl">
                ☁️
              </span>
            )}
          </button>

          {esPropietario && (
            <span className="absolute bottom-1 right-1 rounded-full bg-sky-500 px-2 py-1 text-xs">
              📷
            </span>
          )}

          {menu === "avatar" && (
            <div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-xl border border-white/10 bg-[#24121b] p-2 shadow-xl">
              {avatarActual && (
                <button
                  onClick={() => {
                    setFotoVista(avatarActual);
                    setMenu(null);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  👁️ Ver foto
                </button>
              )}

              {esPropietario && (
                <button
                  onClick={() => abrirArchivo("avatar")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                >
                  📤 Subir foto
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
          if (archivo) subirFoto(archivo, "avatar");
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
          if (archivo) subirFoto(archivo, "cover");
          e.target.value = "";
        }}
      />

      {subiendo && (
        <p className="mt-3 text-sm text-sky-200">
          Subiendo foto...
        </p>
      )}

      {mensaje && (
        <p className="mt-3 text-sm text-sky-200">
          {mensaje}
        </p>
      )}

      {fotoVista && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-5"
          onClick={() => setFotoVista(null)}
        >
          <button
            type="button"
            onClick={() => setFotoVista(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-4 py-2 text-white"
          >
            ✕ Cerrar
          </button>

          <img
            src={fotoVista}
            alt="Foto ampliada"
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}