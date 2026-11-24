
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DesconectarMercadoPago() {
  const router = useRouter();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function desconectar() {
    if (!password) {
      setMensaje("Ingresá tu contraseña de NUBECITA.");
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/mercadopago/desconectar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setMensaje(resultado.error || "No se pudo desvincular Mercado Pago.");
        setCargando(false);
        return;
      }

      setPassword("");
      setMostrarFormulario(false);
      router.refresh();
    } catch {
      setMensaje("No se pudo conectar con el servidor. Intentá nuevamente.");
      setCargando(false);
    }
  }

  return (
    <div>
      {!mostrarFormulario ? (
        <button
          type="button"
          onClick={() => {
            setMensaje("");
            setMostrarFormulario(true);
          }}
          className="rounded-xl bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/25"
        >
          Desvincular Mercado Pago
        </button>
      ) : (
        <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm text-white">
            Para desvincular Mercado Pago, confirmá tu contraseña de NUBECITA.
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña de NUBECITA"
            autoComplete="current-password"
            disabled={cargando}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-400"
          />

          {mensaje && (
            <p className="mt-3 text-sm text-red-300">{mensaje}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={desconectar}
              disabled={cargando}
              className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {cargando ? "Desvinculando..." : "Confirmar desvinculación"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPassword("");
                setMensaje("");
                setMostrarFormulario(false);
              }}
              disabled={cargando}
              className="rounded-xl border border-white/15 px-5 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
