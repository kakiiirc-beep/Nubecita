
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [recuperando, setRecuperando] = useState(false);

  async function iniciarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMensaje("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMensaje("No pudimos verificar tu cuenta.");
      setLoading(false);
      return;
    }

    const { data: suspendida, error: suspensionError } = await supabase.rpc(
      "mi_cuenta_esta_suspendida"
    );

    if (suspensionError) {
      setMensaje("No pudimos verificar el estado de tu cuenta. Intentá nuevamente.");
      setLoading(false);
      return;
    }

    if (suspendida === true) {
      router.replace("/cuenta-suspendida");
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (perfilError) {
      setMensaje("Error al cargar el perfil: " + perfilError.message);
      setLoading(false);
      return;
    }

    if (perfil.username) {
      router.push(`/perfil/${perfil.username}`);
    } else {
      router.push("/");
    }
  }

  async function recuperarContrasena(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMensaje("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    });

    if (error) {
      setMensaje("No se pudo enviar el correo. " + error.message);
    } else {
      setMensaje("Si el correo está registrado, recibirás un enlace para recuperar tu contraseña. Revisá también la carpeta de spam.");
    }

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

        <a
          href="/"
          className="mb-3 block text-center text-3xl font-bold tracking-widest text-sky-600 transition hover:text-sky-500"
        >
          NUBECITA
        </a>

        {recuperando ? (
          <>
            <h2 className="mb-2 text-center text-2xl font-semibold text-slate-900">
              Recuperar contraseña
            </h2>

            <p className="mb-8 text-center text-sm text-slate-500">
              Escribí tu correo electrónico y te enviaremos un enlace para crear una contraseña nueva.
            </p>

            <form onSubmit={recuperarContrasena} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "Enviando..." : "ENVIAR CORREO"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setRecuperando(false);
                setMensaje("");
              }}
              className="mt-5 w-full text-sm font-medium text-sky-600 transition hover:text-sky-700"
            >
              Volver a iniciar sesión
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-center text-2xl font-semibold text-slate-900">
              Iniciar sesión
            </h2>

            <p className="mb-8 text-center text-sm text-slate-500">
              Nos alegra tenerte de vuelta.
            </p>

            <form onSubmit={iniciarSesion} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Contraseña
                </label>

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setRecuperando(true);
                    setMensaje("");
                  }}
                  className="text-sm font-medium text-sky-600 transition hover:text-sky-700"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "Ingresando..." : "INICIAR SESIÓN"}
              </button>
            </form>
          </>
        )}

        {mensaje && (
          <p className="mt-5 text-center text-sm text-sky-700">
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
