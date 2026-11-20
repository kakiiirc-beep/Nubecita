"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditarPerfil() {
  const supabase = createClient();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarPerfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: perfil, error } = await supabase
        .from("profiles")
        .select("full_name, username, bio, role")
        .eq("id", user.id)
        .single();

      if (error || !perfil) {
        setMensaje("No pudimos cargar tu perfil.");
        setLoading(false);
        return;
      }

      

      setNombre(perfil.full_name || "");
      setUsername(perfil.username || "");
      setBio(perfil.bio || "");
      setLoading(false);
    }

    cargarPerfil();
  }, []);

  async function guardarPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");

    const usuario = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(usuario)) {
      setMensaje("El usuario debe tener entre 3 y 20 caracteres, usando letras, números o guion bajo.");
      setGuardando(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nombre.trim(),
        username: usuario,
        bio: bio.trim(),
      })
      .eq("id", user.id);

    if (error) {
      setMensaje(
        error.code === "23505"
          ? "Ese nombre de usuario ya está en uso."
          : "No pudimos guardar los cambios: " + error.message
      );
      setGuardando(false);
      return;
    }

    setMensaje("¡Perfil actualizado correctamente!");
    setGuardando(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#12090d] text-white">
        Cargando perfil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#12090d] px-5 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-pink-900 bg-[#24121b] p-8">
        <h1 className="mb-3 text-center text-3xl font-bold tracking-widest text-pink-300">
          NUBECITA
        </h1>

        <h2 className="mb-8 text-center text-2xl font-semibold">
          Editar mi perfil
        </h2>

        <form onSubmit={guardarPerfil} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm">Nombre visible</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Nombre de usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={20}
              className="w-full rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
              placeholder="tunombre"
            />
            <p className="mt-2 text-xs text-gray-400">
              Tu perfil público utilizará este nombre.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm">Biografía</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full resize-none rounded-lg border border-pink-900 bg-[#12090d] px-4 py-3 outline-none focus:border-pink-400"
              placeholder="Contá algo sobre vos..."
            />
            <p className="mt-2 text-xs text-gray-400">
              Máximo 500 caracteres.
            </p>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-pink-700 py-3 font-semibold transition hover:bg-pink-600 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "GUARDAR CAMBIOS"}
          </button>
        </form>

        {mensaje && (
          <p className="mt-5 text-center text-sm text-pink-300">
            {mensaje}
          </p>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full text-sm text-gray-400 hover:text-pink-300"
        >
          Volver al inicio
        </button>
      </div>
    </main>
  );
}