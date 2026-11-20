"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  usuarioId: string;
};

export default function SolicitarVerificacion({ usuarioId }: Props) {
  const supabase = createClient();

  const [estado, setEstado] = useState<
    "inicial" | "pendiente" | "aprobada" | "rechazada"
  >("inicial");

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  async function comprobarSolicitud() {
    const { data: solicitud, error: errorSolicitud } = await supabase
      .from("solicitudes_verificacion")
      .select("estado")
      .eq("user_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorSolicitud) {
      setMensaje("No pudimos consultar tu solicitud.");
      setCargando(false);
      return;
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorPerfil) {
      setMensaje("No pudimos consultar el estado de tu perfil.");
      setCargando(false);
      return;
    }

    if (perfil?.role === "modelo") {
      setEstado("aprobada");
    } else if (solicitud?.estado === "pendiente") {
      setEstado("pendiente");
    } else if (solicitud?.estado === "rechazada") {
      setEstado("rechazada");
    } else {
      setEstado("inicial");
    }

    setCargando(false);
  }

  async function enviarSolicitud() {
    setCargando(true);
    setMensaje("");

    const { error } = await supabase
      .from("solicitudes_verificacion")
      .insert({
        user_id: usuarioId,
        estado: "pendiente",
      });

    if (error) {
      setMensaje("No pudimos enviar la solicitud. Intentá nuevamente.");
    } else {
      setEstado("pendiente");
      setMensaje("Tu solicitud fue enviada correctamente.");
    }

    setCargando(false);
  }

  useEffect(() => {
    comprobarSolicitud();
  }, [usuarioId]);

  if (cargando) {
    return (
      <p className="text-sm text-gray-400">
        Consultando verificación...
      </p>
    );
  }

  return (
    <div className="flex items-center">
      {estado === "inicial" && (
        <button
          onClick={enviarSolicitud}
          className="rounded-xl border border-sky-200/30 bg-sky-200/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-200/20"
        >
          Solicitar verificación
        </button>
      )}

      {estado === "pendiente" && (
        <span className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm text-yellow-300">
          Solicitud pendiente
        </span>
      )}

      {estado === "aprobada" && (
        <span className="rounded-xl border border-sky-300/30 bg-sky-300/10 px-5 py-3 text-sm text-sky-200">
          ✓ Perfil verificado
        </span>
      )}

      {estado === "rechazada" && (
        <span className="rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-300">
          Solicitud rechazada
        </span>
      )}

      {mensaje && (
        <p className="mt-3 text-sm text-gray-400">
          {mensaje}
        </p>
      )}
    </div>
  );
}