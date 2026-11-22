
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ActualizarContrasena() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);

  async function actualizarContrasena(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");

    if (password.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMensaje("No se pudo actualizar la contraseña. Es posible que el enlace haya vencido. " + error.message);
      setLoading(false);
      return;
    }

    setExito(true);
    setMensaje("¡Tu contraseña fue actualizada correctamente!");
    setPassword("");
    setConfirmarPassword("");
    setLoading(false);
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-12 text-slate-900">

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 10% 15%, rgba(125, 211, 252, 0.35), transparent 35%),
            radial-gradient(ellipse at 85% 25%, rgba(186, 230, 253, 0.45), transparent 35%),
            radial-gradient(ellipse at 50% 85%, rgba(125, 211, 252, 0.25), transparent 40%)
          `,
        }}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-sky-200 bg-white/85 p-8 shadow-xl backdrop-blur-sm">

        <Link
          href="/"
          className="mb-3 block text-center text-3xl font-bold tracking-widest text-sky-600 transition hover:text-sky-500"
        >
          NUBECITA
        </Link>

        <h2 className="mb-2 text-center text-2xl font-semibold text-slate-900">
          Nueva contraseña
        </h2>

        <p className="mb-8 text-center text-sm text-slate-500">
          Elegí una nueva contraseña para tu cuenta.
        </p>

        {!exito ? (
          <form onSubmit={actualizarContrasena} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nueva contraseña
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Confirmar contraseña
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                autoComplete="new-password"
                className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "CAMBIAR CONTRASEÑA"}
            </button>

          </form>
        ) : (
          <Link
            href="/login"
            className="block w-full rounded-lg bg-sky-500 py-3 text-center font-semibold text-white transition hover:bg-sky-600"
          >
            VOLVER AL INICIO DE SESIÓN
          </Link>
        )}

        {mensaje && (
          <p className={`mt-5 text-center text-sm ${exito ? "text-green-600" : "text-red-500"}`}>
            {mensaje}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          NUBECITA © 2026
        </p>

      </div>
    </main>
  );
}
