
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Registro() {
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function registrarse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMensaje("");

    const usuario = username.trim().toLowerCase();
    const correo = email.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(usuario)) {
      setMensaje(
        "El usuario debe tener entre 3 y 20 caracteres. Solo letras, números y guion bajo."
      );
      setLoading(false);
      return;
    }

    if (!correo) {
      setMensaje("Ingresá un correo electrónico válido.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: correo,
      password,
      options: {
        data: {
          full_name: nombre.trim(),
          username: usuario,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMensaje(error.message);
    } else {
      setMensaje(
        "Si el registro es válido, recibirás un correo para confirmar tu cuenta. Si ya tenés una cuenta, iniciá sesión."
      );
    }

    setLoading(false);
  }

  async function registrarseConGoogle() {
    setMensaje("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMensaje(error.message);
    }
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
          className="mb-2 block text-center text-3xl font-bold tracking-widest text-sky-600 transition hover:text-sky-500"
        >
          NUBECITA
        </a>

        <h2 className="mb-2 text-center text-2xl font-semibold text-slate-900">
          Crear cuenta
        </h2>

        <p className="mb-8 text-center text-sm text-slate-500">
          Unite a nuestra comunidad internacional.
        </p>

        <form onSubmit={registrarse} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nombre
            </label>

            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nombre de usuario
            </label>

            <div className="flex items-center rounded-lg border border-sky-200 bg-white px-4 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
              <span className="text-sky-600">@</span>

              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tuusuario"
                autoComplete="username"
                className="w-full bg-transparent px-2 py-3 text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Entre 3 y 20 caracteres. Letras, números y guion bajo.
            </p>
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "CREAR CUENTA"}
          </button>

        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-sky-100" />
          <span className="text-sm text-slate-500">O</span>
          <div className="h-px flex-1 bg-sky-100" />
        </div>

        <button
          type="button"
          onClick={registrarseConGoogle}
          className="w-full rounded-lg border border-sky-200 bg-white py-3 font-semibold text-slate-700 transition hover:bg-sky-50"
        >
          Continuar con Google
        </button>

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
