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

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("username, estado_cuenta")
      .eq("id", user.id)
      .single();

    if (perfilError) {
      setMensaje("Error al cargar el perfil: " + perfilError.message);
      setLoading(false);
      return;
    }

    if (perfil.estado_cuenta === "suspendido") {
      router.replace("/cuenta-suspendida");
      return;
    }

    if (perfil.username) {
      router.push(`/perfil/${perfil.username}`);
    } else {
      router.push("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#12090d] px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-pink-900 bg-[#24121b] p-8 shadow-2xl">
        <h1 className="mb-3 text-center text-3xl font-bold tracking-widest text-pink-300">
          NUBECITA
        </h1>

        <h2 className="mb-2 text-center text-2xl font-semibold">
          Iniciar sesión
        </h2>

        <p className="mb-8 text-center text-sm text-gray-400">
          Nos alegra tenerte de vuelta.
        </p>

        <form onSubmit={iniciarSesion} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm">
              Correo electrónico
            </label>
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
            <label className="mb-2 block text-sm">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-pink-700 py-3 font-semibold transition hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "INICIAR SESIÓN"}
          </button>
        </form>

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