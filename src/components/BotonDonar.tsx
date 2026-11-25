
"use client";

import { useState } from "react";

type Props = {
  modeloId: string;
};

export default function BotonDonar({ modeloId }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function iniciarDonacion() {
    if (cargando) return;

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/donaciones/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modeloId }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo iniciar la donación.");
      }

      const url = new URL(datos.checkoutUrl);

      const dominiosPermitidos = [
        "sandbox.mercadopago.com",
        "sandbox.mercadopago.com.ar",
      ];

      if (
        url.protocol !== "https:" ||
        !dominiosPermitidos.includes(url.hostname)
      ) {
        throw new Error("El enlace de pago no es válido.");
      }

      window.location.assign(url.toString());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al iniciar la donación."
      );
      setCargando(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={iniciarDonacion}
        disabled={cargando}
        className="w-full rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando ? "Preparando donación..." : "♥ DONAR $1.000"}
      </button>

      {error && (
        <p className="mt-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
