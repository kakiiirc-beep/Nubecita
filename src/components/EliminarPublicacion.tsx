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

      // Eliminar primero el registro de la publicación.
      const { data: publicacionEliminada, error: registroError } =
        await supabase
          .from("publicaciones")
          .delete()
          .eq("id", publicationId)
          .eq("user_id", user.id)
          .select("id");

      if (registroError) {
        setMensaje(
          "No se pudo eliminar la publicación: " + registroError.message
        );
        return;
      }

      if (!publicacionEliminada || publicacionEliminada.length === 0) {
        setMensaje("No se encontró la publicación o no tenés permiso para eliminarla.");
        return;
      }

      // Preparar los archivos que pertenecen a la publicación.
      const archivos = [...new Set(
        [filePath, previewPath].filter(
          (ruta): ruta is string => Boolean(ruta)
        )
      )];

      // Eliminar los archivos del bucket.
      if (archivos.length > 0) {
        const { error: archivoError } = await supabase.storage
          .from("Nubecita bucket")
          .remove(archivos);

        if (archivoError) {
          setMensaje(
            "La publicación se eliminó, pero no se pudieron borrar todos sus archivos del almacenamiento: " +
              archivoError.message
          );
          router.refresh();
          return;
        }
      }

      setMensaje("¡Publicación eliminada correctamente!");
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