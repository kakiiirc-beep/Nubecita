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
      <div className="flex items-center rounded-full border border-sky-200/30 bg-[#151019] px-4 transition focus-within:border-sky-200">
        <span className="mr-2 text-sky-200">@</span>

        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar usuarios..."
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
        />

        <button
          type="submit"
          aria-label="Buscar usuario"
          className="ml-2 rounded-full px-3 py-2 text-sky-200 transition hover:bg-sky-200/10"
        >
          🔍
        </button>
      </div>
    </form>
  );
}