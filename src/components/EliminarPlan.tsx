"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EliminarPlanProps = {
  planId: string;
  userId: string;
};

export default function EliminarPlan({
  planId,
  userId,
}: EliminarPlanProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function eliminarPlan() {
    const confirmar = window.confirm(
      "¿Querés retirar este plan? Dejará de estar disponible para nuevas compras, pero los clientes que ya lo compraron conservarán su acceso hasta el vencimiento."
    );

    if (!confirmar) return;

    setCargando(true);
    setMensaje("");

    const supabase = createClient();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        throw new Error("No tenés permiso para retirar este plan.");
      }

      const { data, error } = await supabase
        .from("planes")
        .update({ activo: false })
        .eq("id", planId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error("No se pudo retirar el plan.");
      }

      setMensaje("Plan retirado correctamente.");
      router.refresh();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al retirar el plan."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={eliminarPlan}
        disabled={cargando}
        className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
      >
        {cargando ? "Retirando plan..." : "Retirar plan"}
      </button>

      {mensaje && (
        <p className="text-center text-xs text-gray-300">
          {mensaje}
        </p>
      )}
    </div>
  );
}