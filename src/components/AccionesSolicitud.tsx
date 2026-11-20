"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  solicitudId: string;
};

export default function AccionesSolicitud({ solicitudId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function revisar(decision: "aprobada" | "rechazada") {
    const confirmar = window.confirm(
      decision === "aprobada"
        ? "¿Querés aprobar esta verificación?"
        : "¿Querés rechazar esta solicitud?"
    );

    if (!confirmar) return;

    setCargando(true);
    setMensaje("");

    const { error } = await supabase.rpc(
      "revisar_solicitud_verificacion",
      {
        p_solicitud_id: solicitudId,
        p_decision: decision,
      }
    );

    if (error) {
      setMensaje("No se pudo revisar: " + error.message);
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => revisar("aprobada")}
          disabled={cargando}
          className="rounded-xl bg-green-500/15 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-50"
        >
          Aprobar
        </button>

        <button
          onClick={() => revisar("rechazada")}
          disabled={cargando}
          className="rounded-xl bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>

      {mensaje && (
        <p className="mt-3 text-sm text-red-300">{mensaje}</p>
      )}
    </div>
  );
}