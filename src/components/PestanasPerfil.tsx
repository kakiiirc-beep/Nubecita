"use client";

import { useState, type ReactNode } from "react";

export default function PestanasPerfil({
  publicaciones,
  planes,
}: {
  publicaciones: ReactNode;
  planes: ReactNode;
}) {
  const [pestana, setPestana] = useState<"publicaciones" | "planes">(
    "publicaciones"
  );

  return (
    <section>
      <div className="flex items-center gap-7 border-b border-white/10">
        <button
          onClick={() => setPestana("publicaciones")}
          className={`border-b-2 pb-3 text-sm font-semibold transition ${
            pestana === "publicaciones"
              ? "border-sky-200 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Publicaciones
        </button>

        <button
          onClick={() => setPestana("planes")}
          className={`border-b-2 pb-3 text-sm font-semibold transition ${
            pestana === "planes"
              ? "border-sky-200 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Planes
        </button>
      </div>

      <div className="mt-6">
        {pestana === "publicaciones" ? publicaciones : planes}
      </div>
    </section>
  );
}