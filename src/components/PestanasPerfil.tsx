
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
      <div className="flex items-center justify-center gap-7 border-b border-slate-200">
        <button
          onClick={() => setPestana("publicaciones")}
          className={`border-b-2 pb-3 text-sm font-semibold transition ${
            pestana === "publicaciones"
              ? "border-sky-400 text-black"
              : "border-transparent text-black hover:text-sky-600"
          }`}
        >
          Publicaciones
        </button>

        <button
          onClick={() => setPestana("planes")}
          className={`border-b-2 pb-3 text-sm font-semibold transition ${
            pestana === "planes"
              ? "border-sky-400 text-black"
              : "border-transparent text-black hover:text-sky-600"
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
