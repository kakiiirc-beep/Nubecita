
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  username: string;
};

export default function EditarPerfilModal({ userId, username }: Props) {
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState(username);
  const [bio, setBio] = useState("");

  const [valoresIniciales, setValoresIniciales] = useState({
    nombre: "",
    username,
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const hayCambios =
    nombre !== valoresIniciales.nombre ||
    usuario !== valoresIniciales.username ||
    bio !== valoresIniciales.bio;

  useEffect(() => {
    if (!abierto) return;

    async function cargarPerfil() {
      setLoading(true);
      setMensaje("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) {
        router.push("/login");
        return;
      }

      const { data: perfil, error } = await supabase
        .from("profiles")
        .select("full_name, username, bio")
        .eq("id", userId)
        .single();

      if (error || !perfil) {
        setMensaje("No pudimos cargar tu perfil.");
        setLoading(false);
        return;
      }

      const datos = {
        nombre: perfil.full_name || "",
        username: perfil.username || "",
        bio: perfil.bio || "",
      };

      setNombre(datos.nombre);
      setUsuario(datos.username);
      setBio(datos.bio);
      setValoresIniciales(datos);
      setLoading(false);
    }

    cargarPerfil();
  }, [abierto, userId, router]);

  async function guardarPerfil(): Promise<boolean> {
    setGuardando(true);
    setMensaje("");

    const usuarioLimpio = usuario.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(usuarioLimpio)) {
      setMensaje(
        "El usuario debe tener entre 3 y 20 caracteres, usando letras, números o guion bajo."
      );
      setGuardando(false);
      return false;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      setMensaje("No tenés permiso para editar este perfil.");
      setGuardando(false);
      return false;
    }

    const datosActualizados = {
      nombre: nombre.trim(),
      username: usuarioLimpio,
      bio: bio.trim(),
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: datosActualizados.nombre,
        username: datosActualizados.username,
        bio: datosActualizados.bio,
      })
      .eq("id", user.id);

    if (error) {
      setMensaje(
        error.code === "23505"
          ? "Ese nombre de usuario ya está en uso."
          : "No pudimos guardar los cambios: " + error.message
      );
      setGuardando(false);
      return false;
    }

    setNombre(datosActualizados.nombre);
    setUsuario(datosActualizados.username);
    setBio(datosActualizados.bio);
    setValoresIniciales(datosActualizados);

    setMensaje("¡Perfil actualizado correctamente!");
    setGuardando(false);

    router.replace(
      `/perfil/${encodeURIComponent(datosActualizados.username)}`
    );
    router.refresh();

    return true;
  }

  async function manejarEnvio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await guardarPerfil();
  }

  async function cerrarModal() {
    if (guardando) return;

    if (hayCambios) {
      const deseaGuardar = window.confirm(
        "Los cambios no han sido guardados, ¿deseás guardar los cambios?"
      );

      if (deseaGuardar) {
        const guardado = await guardarPerfil();

        if (!guardado) return;
      }
    }

    setAbierto(false);
    setMensaje("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-400"
      >
        Editar perfil
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-sky-950/30 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          {/* Fondo blanco con nubes celestes difuminadas y fijas */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0"
            style={{
              backgroundColor: "#ffffff",
              backgroundImage: `
                radial-gradient(ellipse 38% 25% at 12% 18%, rgba(125, 211, 252, 0.42), transparent 75%),
                radial-gradient(ellipse 35% 28% at 85% 22%, rgba(147, 197, 253, 0.38), transparent 75%),
                radial-gradient(ellipse 42% 30% at 48% 55%, rgba(186, 230, 253, 0.45), transparent 75%),
                radial-gradient(ellipse 35% 25% at 15% 88%, rgba(125, 211, 252, 0.35), transparent 75%),
                radial-gradient(ellipse 38% 28% at 90% 85%, rgba(147, 197, 253, 0.38), transparent 75%)
              `,
            }}
          />

          <div className="relative z-10 my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-sky-200 bg-white/85 p-6 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-8">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={guardando}
              aria-label="Cerrar editor"
              className="absolute right-4 top-4 text-2xl text-slate-500 transition hover:text-sky-600 disabled:opacity-50"
            >
              ×
            </button>

            {loading ? (
              <div className="py-16 text-center text-slate-700">
                Cargando perfil...
              </div>
            ) : (
              <>
                <h1 className="mb-3 text-center text-3xl font-bold tracking-widest text-sky-600">
                  NUBECITA
                </h1>

                <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">
                  Editar mi perfil
                </h2>

                <form onSubmit={manejarEnvio} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Nombre visible
                    </label>

                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      maxLength={60}
                      className="w-full rounded-lg border border-sky-200 bg-white/90 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Nombre de usuario
                    </label>

                    <input
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      required
                      maxLength={20}
                      className="w-full rounded-lg border border-sky-200 bg-white/90 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                      placeholder="tunombre"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Tu perfil público utilizará este nombre.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      Biografía
                    </label>

                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={500}
                      rows={5}
                      className="w-full resize-none rounded-lg border border-sky-200 bg-white/90 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                      placeholder="Contá algo sobre vos..."
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Máximo 500 caracteres.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "GUARDAR CAMBIOS"}
                  </button>
                </form>

                {mensaje && (
                  <p className="mt-5 text-center text-sm font-medium text-sky-700">
                    {mensaje}
                  </p>
                )}

                <button
                  type="button"
                  disabled={guardando}
                  onClick={cerrarModal}
                  className="mt-6 w-full text-sm text-slate-500 transition hover:text-sky-600 disabled:opacity-50"
                >
                  Volver al perfil
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
