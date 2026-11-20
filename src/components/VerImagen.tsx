"use client";

import { useEffect, useState } from "react";

type Imagen = {
  url: string;
  previewUrl: string;
  alt: string;
};

type Props = {
  url: string;
  previewUrl: string;
  alt: string;
  imagenes: Imagen[];
  indice: number;
};

export default function VerImagen({
  url,
  previewUrl,
  alt,
  imagenes,
  indice,
}: Props) {
  const [abierta, setAbierta] = useState(false);
  const [actual, setActual] = useState(indice);

  useEffect(() => {
    if (!abierta) return;

    function cerrarConEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(false);
      if (e.key === "ArrowRight") {
        setActual((n) => (n + 1) % imagenes.length);
      }
      if (e.key === "ArrowLeft") {
        setActual((n) => (n - 1 + imagenes.length) % imagenes.length);
      }
    }

    document.addEventListener("keydown", cerrarConEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = "";
    };
  }, [abierta, imagenes.length]);

  const imagenActual = imagenes[actual] || { url, previewUrl, alt };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActual(indice);
          setAbierta(true);
        }}
        className="block w-full cursor-zoom-in"
        aria-label="Ver imagen completa"
      >
        <img
          src={previewUrl}
          alt={alt}
          className="aspect-square w-full object-cover"
        />
      </button>

      {abierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setAbierta(false)}
        >
          <button
            type="button"
            onClick={() => setAbierta(false)}
            className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white hover:bg-white/20"
            aria-label="Cerrar imagen"
          >
            ×
          </button>

          {imagenes.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActual((n) => (n - 1 + imagenes.length) % imagenes.length);
                }}
                className="absolute left-3 z-10 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20 sm:left-8"
                aria-label="Imagen anterior"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActual((n) => (n + 1) % imagenes.length);
                }}
                className="absolute right-3 z-10 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20 sm:right-8"
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}

          <>
  <img
    src={imagenActual.url}
    alt={imagenActual.alt}
    onClick={(e) => e.stopPropagation()}
    className="max-h-[90vh] max-w-full rounded-lg object-contain"
  />

  <div
    className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white"
    onClick={(e) => e.stopPropagation()}
  >
    {actual + 1} / {imagenes.length}
  </div>
</>
        </div>
      )}
    </>
  );
}