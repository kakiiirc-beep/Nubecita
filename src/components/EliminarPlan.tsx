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
      "¿Estás seguro de que querés borrar este plan? Se eliminarán también todas sus fotos y videos. Esta acción no se puede deshacer."
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
        throw new Error("No tenés permiso para borrar este plan.");
      }

      const { data: plan, error: planError } = await supabase
        .from("planes")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();

      if (planError || !plan) {
        throw new Error(
          "No se encontró el plan o no tenés permiso para borrarlo."
        );
      }

      const { data: archivos, error: archivosError } = await supabase
        .from("plan_archivos")
        .select("file_path")
        .eq("plan_id", planId);

      if (archivosError) {
        throw new Error(
          "No se pudieron consultar los archivos del plan: " +
            archivosError.message
        );
      }

      const rutas = (archivos || [])
        .map((archivo) => archivo.file_path)
        .filter((ruta): ruta is string => Boolean(ruta));

      if (rutas.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("Nubecita bucket")
          .remove(rutas);

        if (storageError) {
          throw new Error(
            "No se pudieron eliminar los archivos del plan: " +
              storageError.message
          );
        }
      }

      const { error: eliminarPlanError } = await supabase
        .from("planes")
        .delete()
        .eq("id", planId)
        .eq("user_id", user.id);

      if (eliminarPlanError) {
        throw new Error(
          "Los archivos fueron eliminados, pero no se pudo borrar el plan: " +
            eliminarPlanError.message
        );
      }

      setMensaje("Plan eliminado correctamente.");
      router.refresh();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al eliminar el plan."
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
        {cargando ? "Eliminando plan..." : "Borrar plan"}
      </button>

      {mensaje && (
        <p className="text-center text-xs text-gray-300">
          {mensaje}
        </p>
      )}
    </div>
  );
}