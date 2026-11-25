
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  precio: number;
};

type Archivo = {
  id: string;
  mime_type: string;
  descripcion: string | null;
  posicion: number;
  url: string;
  previewUrl: string;
};

export default function VerPlanPage() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [requiereCompra, setRequiereCompra] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [errorCompra, setErrorCompra] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPlan() {
      try {
        setCargando(true);
        setError("");

        const supabase = createClient();

        const { data: datosPlan, error: errorPlan } = await supabase
          .from("planes")
          .select("id, nombre, descripcion, tipo, precio")
          .eq("id", planId)
          .maybeSingle();

        if (errorPlan || !datosPlan) {
          throw new Error("No se pudo encontrar este plan.");
        }

        const respuesta = await fetch(`/api/planes/${planId}`, {
          cache: "no-store",
        });

        const datosContenido = await respuesta.json();

        if (!activo) return;

        setPlan(datosPlan);

        if (
          !respuesta.ok &&
          datosContenido.code === "PURCHASE_REQUIRED"
        ) {
          setArchivos([]);
          setRequiereCompra(true);
          return;
        }

        if (!respuesta.ok) {
          throw new Error(
            datosContenido.error || "No se pudo cargar el contenido."
          );
        }

        setRequiereCompra(false);
        setArchivos(datosContenido.contenido || []);
      } catch (err) {
        if (!activo) return;

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar el plan."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (planId) {
      cargarPlan();
    }

    return () => {
      activo = false;
    };
  }, [planId]);

  async function iniciarCompra() {
    try {
      setComprando(true);
      setErrorCompra("");

      const respuesta = await fetch(
        `/api/planes/${planId}/comprar`,
        {
          method: "POST",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudo iniciar la compra."
        );
      }

      if (
        typeof datos.checkoutUrl !== "string" ||
        !datos.checkoutUrl
      ) {
        throw new Error(
          "Mercado Pago no devolvió un enlace de pago válido."
        );
      }

      const urlCheckout = new URL(datos.checkoutUrl);

      const dominiosPermitidos = [
        "www.mercadopago.com",
        "www.mercadopago.com.ar",
        "sandbox.mercadopago.com",
      ];

      if (
        urlCheckout.protocol !== "https:" ||
        !dominiosPermitidos.includes(urlCheckout.hostname)
      ) {
        throw new Error(
          "Mercado Pago devolvió una dirección de pago no válida."
        );
      }

      window.location.assign(urlCheckout.toString());
    } catch (err) {
      setErrorCompra(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al iniciar la compra."
      );

      setComprando(false);
    }
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-sky-50 px-4 py-10 text-center text-slate-700">
        Cargando plan...
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-sky-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-sky-200 bg-white p-6 text-center shadow-sm">
          <p className="text-red-600">
            {error || "No se pudo cargar el plan."}
          </p>

          <a
            href="/"
            className="mt-5 inline-block rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-600"
          >
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="mb-6 inline-block text-sm font-semibold text-sky-700 hover:underline"
        >
          ← Volver
        </a>

        <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
          <div className="bg-sky-100 px-5 py-6 sm:px-8">
            <h1 className="text-2xl font-bold">{plan.nombre}</h1>

            {plan.descripcion && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {plan.descripcion}
              </p>
            )}

            <div className="mt-4 font-semibold text-sky-800">
              {plan.tipo === "gratuito" || Number(plan.precio) === 0
                ? "Gratuito"
                : `$${Number(plan.precio).toLocaleString("es-AR")}`}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {requiereCompra && plan.tipo === "pago" && (
              <div className="mb-8 rounded-xl border border-sky-200 bg-sky-50 p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Desbloqueá este pack
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Para acceder a las fotos y videos de este plan,
                  primero necesitás completar la compra.
                </p>

                <button
                  type="button"
                  onClick={iniciarCompra}
                  disabled={comprando}
                  className="mt-5 w-full rounded-xl bg-sky-500 px-5 py-3 font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {comprando
                    ? "Redirigiendo a Mercado Pago..."
                    : "Comprar pack"}
                </button>

                {errorCompra && (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    {errorCompra}
                  </p>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Pago de prueba mediante Mercado Pago Sandbox.
                </p>
              </div>
            )}

            <h2 className="mb-5 text-lg font-bold">
              Contenido del plan
            </h2>

            {requiereCompra ? (
              <p className="text-sm text-slate-500">
                Comprá este pack para desbloquear sus fotos y videos.
              </p>
            ) : archivos.length === 0 ? (
              <p className="text-sm text-slate-500">
                Este plan todavía no tiene archivos disponibles.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {archivos.map((archivo) => (
                  <article
                    key={archivo.id}
                    className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50"
                  >
                    {archivo.mime_type.startsWith("video/") ? (
                      <video
                        src={archivo.url}
                        controls
                        playsInline
                        className="w-full bg-black"
                      />
                    ) : archivo.mime_type.startsWith("image/") ? (
                      <img
                        src={archivo.url}
                        alt={archivo.descripcion || "Contenido del plan"}
                        className="w-full object-contain"
                      />
                    ) : (
                      <a
                        href={archivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-5 font-semibold text-sky-700 hover:underline"
                      >
                        Ver archivo
                      </a>
                    )}

                    {archivo.descripcion && (
                      <p className="whitespace-pre-wrap px-4 py-3 text-sm text-slate-700">
                        {archivo.descripcion}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
