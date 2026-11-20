"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  usuarioId: string;
  estado: string;
};

export default function AccionesCuenta({ usuarioId, estado }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function administrar(accion: "suspender" | "reactivar") {
    let motivo: string | null = null;

    if (accion === "suspender") {
      motivo = window.prompt(
        "Escribí el motivo de la suspensión (mínimo 10 caracteres):"
      );

      if (motivo === null) return;

      if (motivo.trim().length < 10 || motivo.trim().length > 1000) {
        setMensaje("El motivo debe tener entre 10 y 1000 caracteres.");
        return;
      }
    }

    const confirmar = window.confirm(
      accion === "suspender"
        ? "¿Seguro que querés suspender esta cuenta?"
        : "¿Querés reactivar esta cuenta?"
    );

    if (!confirmar) return;

    setCargando(true);
    setMensaje("");

    const { error } = await supabase.rpc("administrar_estado_cuenta", {
      p_usuario_id: usuarioId,
      p_accion: accion,
      p_motivo: motivo,
    });

    if (error) {
      setMensaje("No se pudo actualizar la cuenta: " + error.message);
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {estado === "activo" ? (
        <button
          onClick={() => administrar("suspender")}
          disabled={cargando}
          className="rounded-xl bg-red-500/15 px-5 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
        >
          {cargando ? "Procesando..." : "Suspender cuenta"}
        </button>
      ) : (
        <button
          onClick={() => administrar("reactivar")}
          disabled={cargando}
          className="rounded-xl bg-green-500/15 px-5 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-50"
        >
          {cargando ? "Procesando..." : "Reactivar cuenta"}
        </button>
      )}

      {mensaje && (
        <p className="mt-3 text-sm text-red-300">{mensaje}</p>
      )}
    </div>
  );
}