
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BuscadorUsuarios() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");

  function buscarUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const username = busqueda.trim().replace(/^@+/, "");

    if (!username) return;

    router.push(`/perfil/${encodeURIComponent(username.toLowerCase())}`);
  }

  return (
    <form onSubmit={buscarUsuario} className="w-full max-w-md">
      <div className="flex items-center rounded-full border border-slate-600 bg-[#30343b] px-4 transition focus-within:border-sky-400">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar usuarios"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
        />
      </div>
    </form>
  );
}
