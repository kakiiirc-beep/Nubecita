"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  perfilId: string;
  usuarioActualId: string | null;
};

export default function BotonSeguir({
  perfilId,
  usuarioActualId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [siguiendo, setSiguiendo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function comprobarSeguimiento() {
      if (!usuarioActualId || usuarioActualId === perfilId) {
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from("seguimientos")
        .select("seguidor_id")
        .eq("seguidor_id", usuarioActualId)
        .eq("seguido_id", perfilId)
        .maybeSingle();

      if (!error) {
        setSiguiendo(!!data);
      }

      setCargando(false);
    }

    comprobarSeguimiento();
  }, [perfilId, usuarioActualId]);

  async function cambiarSeguimiento() {
    if (!usuarioActualId) {
      router.push("/login");
      return;
    }

    setCargando(true);

    if (siguiendo) {
      const { error } = await supabase
        .from("seguimientos")
        .delete()
        .eq("seguidor_id", usuarioActualId)
        .eq("seguido_id", perfilId);

      if (!error) setSiguiendo(false);
    } else {
      const { error } = await supabase
        .from("seguimientos")
        .insert({
          seguidor_id: usuarioActualId,
          seguido_id: perfilId,
        });

      if (!error) setSiguiendo(true);
    }

    setCargando(false);
  }

  if (usuarioActualId === perfilId) return null;

  return (
    <button
      onClick={cambiarSeguimiento}
      disabled={cargando}
      className="rounded-xl bg-sky-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-50"
    >
      {cargando
        ? "Cargando..."
        : siguiendo
          ? "Dejar de seguir"
          : "Seguir"}
    </button>
  );
}