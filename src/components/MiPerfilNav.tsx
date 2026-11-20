"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function MiPerfilNav() {
  const [username, setUsername] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarPerfil() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCargando(false);
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (perfil?.username) {
        setUsername(perfil.username);
      }

      setCargando(false);
    }

    cargarPerfil();
  }, []);

  if (cargando || !username) {
    return null;
  }

  return (
    <Link
      href={`/perfil/${username}`}
      className="fixed bottom-6 right-6 z-50 rounded-full border border-pink-400 bg-pink-700 px-6 py-3 font-semibold text-white shadow-xl transition hover:bg-pink-600"
    >
      ☁️ Mi perfil
    </Link>
  );
}