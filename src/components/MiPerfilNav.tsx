
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CrearPlanAviso from "@/components/CrearPlanAviso";

export default function MiPerfilNav() {
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] = useState<string | null>(null);
  const [sesionActiva, setSesionActiva] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState(false);

  useEffect(() => {
    async function cargarPerfil() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setSesionActiva(false);
        setCargando(false);
        return;
      }

      setSesionActiva(true);

      const { data: perfil } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", authData.user.id)
        .single();

      setUsername(perfil?.username ?? null);
      setCargando(false);
    }

    cargarPerfil();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSesionActiva(!!session?.user);

      if (!session?.user) {
        setUsername(null);
        setMenuAbierto(false);
        setCargando(false);
      } else if (event === "SIGNED_IN") {
        setCargando(true);
        cargarPerfil();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuAbierto(false);
      }
    }

    window.addEventListener("keydown", manejarEscape);

    return () => {
      window.removeEventListener("keydown", manejarEscape);
    };
  }, []);

  useEffect(() => {
    function manejarVisor(e: Event) {
      const evento = e as CustomEvent<boolean>;
      setFotoAbierta(evento.detail);

      if (evento.detail) {
        setMenuAbierto(false);
      }
    }

    window.addEventListener("nubecita:visor-foto", manejarVisor);

    return () => {
      window.removeEventListener("nubecita:visor-foto", manejarVisor);
    };
  }, []);

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión:", error);
      alert("No se pudo cerrar la sesión: " + error.message);
      return;
    }

    setMenuAbierto(false);
    window.location.href = "/";
  }

  if (cargando || fotoAbierta) return null;

  // Menú para visitantes sin sesión iniciada
  if (!sesionActiva) {
    return (
      <div className="fixed right-6 top-20 z-[10000] flex flex-col items-end">
        {menuAbierto && (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuAbierto(false)}
            />

            <div className="relative z-50 mt-3 w-48 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xl">
              <Link
                href="/login"
                onClick={() => setMenuAbierto(false)}
                className="block px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-sky-50"
              >
                Iniciar sesión
              </Link>

              <Link
                href="/registro"
                onClick={() => setMenuAbierto(false)}
                className="block border-t border-slate-100 px-4 py-2 text-xs text-sky-600 transition hover:bg-sky-50"
              >
                Crear cuenta
              </Link>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Abrir menú de usuario"
          aria-expanded={menuAbierto}
          className="relative z-50 flex h-12 w-12 items-center justify-center rounded-full border border-sky-300 bg-white text-sky-600 shadow-md transition hover:bg-sky-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
          >
            <circle cx="12" cy="8" r="4" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 21a7.5 7.5 0 0 1 15 0"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Menú para usuarios con sesión iniciada
  if (!username) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col items-end gap-2">
      {menuAbierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuAbierto(false)}
          />

          <div className="relative z-50 w-48 overflow-hidden rounded-xl border border-slate-600 bg-[#30343b] shadow-xl">
            <Link
              href={`/perfil/${username}`}
              onClick={() => setMenuAbierto(false)}
              className="block px-4 py-3 text-sm text-white transition hover:bg-slate-600"
            >
              Ver mi perfil
            </Link>

            <CrearPlanAviso ubicacion="menu" />

            <button
              type="button"
              onClick={cerrarSesion}
              className="block w-full px-4 py-3 text-left text-sm text-white transition hover:bg-slate-600"
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="relative z-50 rounded-full border border-sky-300 bg-sky-500 px-6 py-3 font-semibold text-white shadow-xl transition hover:bg-sky-400"
      >
        ☁️ Mi perfil
      </button>
    </div>
  );
}
