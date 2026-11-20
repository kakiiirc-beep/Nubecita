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

    if (!/^[a-z0-9_]{3,20}$/.test(usuario)) {
      setMensaje("El usuario debe tener entre 3 y 20 caracteres. Solo letras, números y guion bajo.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nombre,
          username: usuario,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMensaje(error.message);
    } else {
      setMensaje("¡Registro exitoso! Revisá tu correo para confirmar tu cuenta.");
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
    <main className="flex min-h-screen items-center justify-center bg-[#12090d] px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-pink-900 bg-[#24121b] p-8 shadow-2xl">

        <h1 className="mb-2 text-center text-3xl font-bold tracking-widest text-pink-300">
          NUBECITA
        </h1>

        <h2 className="mb-2 text-center text-2xl font-semibold">
          Crear cuenta
        </h2>

        <p className="mb-8 text-center text-sm text-gray-400">
          Unite a nuestra comunidad internacional.
        </p>

        <form onSubmit={registrarse} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Nombre de usuario</label>
            <div className="flex items-center rounded-lg border border-pink-900 bg-[#12090d] px-4 focus-within:border-pink-400">
              <span className="text-pink-300">@</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tuusuario"
                autoComplete="username"
                className="w-full bg-transparent px-2 py-3 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Entre 3 y 20 caracteres. Letras, números y guion bajo.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-pink-700 py-3 font-semibold transition hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "CREAR CUENTA"}
          </button>

        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm text-gray-400">O</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={registrarseConGoogle}
          className="w-full rounded-lg border border-white/20 py-3 font-semibold transition hover:bg-white/10"
        >
          Continuar con Google
        </button>

        {mensaje && (
          <p className="mt-5 text-center text-sm text-pink-300">
            {mensaje}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-gray-500">
          NUBECITA © 2026
        </p>

      </div>
    </main>
  );
}