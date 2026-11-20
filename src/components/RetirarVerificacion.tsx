"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  usuarioId: string;
};

export default function RetirarVerificacion({ usuarioId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function retirar() {
    const confirmar = window.confirm(
      "¿Seguro que querés retirar la verificación de este perfil?"
    );

    if (!confirmar) return;

    setCargando(true);
    setMensaje("");

    const { error } = await supabase.rpc("retirar_verificacion", {
      p_usuario_id: usuarioId,
    });

    if (error) {
      setMensaje("No se pudo retirar: " + error.message);
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <button
        onClick={retirar}
        disabled={cargando}
        className="rounded-xl bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        {cargando ? "Retirando..." : "Retirar verificación"}
      </button>

      {mensaje && (
        <p className="mt-3 text-sm text-red-300">{mensaje}</p>
      )}
    </div>
  );
}