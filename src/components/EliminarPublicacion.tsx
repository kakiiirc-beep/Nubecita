"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  publicationId: string;
  filePath: string;
  previewPath?: string | null;
  userId: string;
};

export default function EliminarPublicacion({
  publicationId,
  filePath,
  previewPath,
  userId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function eliminar() {
    if (!confirm("¿Seguro que querés eliminar esta publicación?")) {
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        setMensaje("No tenés permiso para eliminar esta publicación.");
        return;
      }

      const archivos = previewPath
        ? [filePath, previewPath]
        : [filePath];

      const { error: archivoError } = await supabase.storage
        .from("Nubecita bucket")
        .remove(archivos);

      if (archivoError) {
        setMensaje("No se pudieron eliminar los archivos: " + archivoError.message);
        return;
      }

      const { error: registroError } = await supabase
        .from("publicaciones")
        .delete()
        .eq("id", publicationId)
        .eq("user_id", user.id);

      if (registroError) {
        setMensaje("No se pudo eliminar el registro: " + registroError.message);
        return;
      }

      router.refresh();
    } catch {
      setMensaje("Ocurrió un error al eliminar la publicación.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={eliminar}
        disabled={cargando}
        className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        {cargando ? "Eliminando..." : "Eliminar publicación"}
      </button>

      {mensaje && (
        <p className="mt-2 text-xs text-red-300">{mensaje}</p>
      )}
    </div>
  );
}