"use client";

import { useEffect, useState } from "react";

export default function NotificacionFotos() {
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    function recibirMensaje(e: Event) {
      const evento = e as CustomEvent<string>;
      setMensaje(evento.detail);
    }

    window.addEventListener("nubecita:foto-mensaje", recibirMensaje);

    return () => {
      window.removeEventListener("nubecita:foto-mensaje", recibirMensaje);
    };
  }, []);

  if (!mensaje) return null;

  return (
    <p className="mt-3 text-sm font-semibold text-sky-200">
      {mensaje}
    </p>
  );
}