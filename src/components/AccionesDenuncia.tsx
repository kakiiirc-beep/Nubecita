"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  denunciaId: string;
};

export default function AccionesDenuncia({ denunciaId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function revisar(decision: "revisada" | "resuelta" | "desestimada") {
    const confirmar = window.confirm(
      decision === "resuelta"
        ? "¿Querés marcar esta denuncia como resuelta?"
        : decision === "desestimada"
          ? "¿Querés desestimar esta denuncia?"
          : "¿Querés marcar esta denuncia como revisada?"
    );

    if (!confirmar) return;

    setCargando(true);
    setMensaje("");

    const { error } = await supabase.rpc("revisar_denuncia", {
      p_denuncia_id: denunciaId,
      p_decision: decision,
    });

    if (error) {
      setMensaje("No se pudo actualizar: " + error.message);
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => revisar("revisada")}
          disabled={cargando}
          className="rounded-xl bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-300 disabled:opacity-50"
        >
          Marcar revisada
        </button>

        <button
          onClick={() => revisar("resuelta")}
          disabled={cargando}
          className="rounded-xl bg-green-500/15 px-4 py-2 text-sm font-semibold text-green-300 disabled:opacity-50"
        >
          Resolver
        </button>

        <button
          onClick={() => revisar("desestimada")}
          disabled={cargando}
          className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-50"
        >
          Desestimar
        </button>
      </div>

      {mensaje && (
        <p className="mt-3 text-sm text-red-300">{mensaje}</p>
      )}
    </div>
  );
}