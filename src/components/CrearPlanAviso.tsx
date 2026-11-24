
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  ubicacion: "perfil" | "menu";
  verificado: boolean;
};

export default function CrearPlanAviso({
  ubicacion,
  verificado,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  function accederCrearPlan() {
    if (verificado) {
      router.push("/crear-plan");
      return;
    }

    setAbierto(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={accederCrearPlan}
        className={
          ubicacion === "perfil"
            ? "flex w-full items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 py-4 text-base font-bold text-sky-600 shadow-sm transition hover:bg-sky-50"
            : "block w-full border-b border-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
        }
      >
        ＋ CREAR PLAN
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crear-plan-titulo"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1420] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center text-3xl">🛡️</div>

            <h2
              id="crear-plan-titulo"
              className="text-center text-xl font-bold text-white"
            >
              Verificación requerida
            </h2>

            <p className="mt-4 text-center text-sm leading-7 text-gray-300">
              Para acceder a la creación de planes, necesitás solicitar y
              obtener la verificación de tu cuenta.
            </p>

            <p className="mt-2 text-center text-sm leading-6 text-gray-400">
              Una vez aprobada tu solicitud, podrás crear tus propios planes
              y ofrecer contenido exclusivo.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                Entendido
              </button>

              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  router.push("/solicitar-verificacion");
                }}
                className="flex-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
              >
                Solicitar verificación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
