"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  publicationId: string;
  description: string;
  visibility: string;
  userId: string;
};

export default function EditarPublicacion({
  publicationId,
  description,
  visibility,
  userId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState(description);
  const [tipo, setTipo] = useState(visibility);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function guardar() {
    setCargando(true);
    setMensaje("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        setMensaje("No tenés permiso para editar esta publicación.");
        return;
      }

      const { error } = await supabase
        .from("publicaciones")
        .update({
          description: descripcion,
          visibility: tipo,
        })
        .eq("id", publicationId)
        .eq("user_id", user.id);

      if (error) {
        setMensaje("No se pudieron guardar los cambios: " + error.message);
        return;
      }

      setMensaje("¡Cambios guardados!");
      setAbierto(false);
      router.refresh();
    } catch {
      setMensaje("Ocurrió un error al guardar los cambios.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="rounded-lg border border-sky-200/30 px-3 py-2 text-xs text-sky-200 transition hover:bg-sky-200/10"
      >
        {abierto ? "Cancelar edición" : "Editar publicación"}
      </button>

      {abierto && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-2 block text-xs text-white">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="min-h-20 w-full rounded-lg border border-white/10 bg-black p-3 text-sm text-white outline-none focus:border-sky-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-white">
              Visibilidad
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black p-3 text-sm text-white"
            >
              <option value="publico">Pública</option>
              <option value="privado">Privada</option>
            </select>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={cargando}
            className="rounded-lg bg-sky-200 px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      {mensaje && (
        <p className="mt-2 text-xs text-sky-200">{mensaje}</p>
      )}
    </div>
  );
}