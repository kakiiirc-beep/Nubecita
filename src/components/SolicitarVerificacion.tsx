
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  usuarioId: string;
};

type Estado =
  | "inicial"
  | "pendiente"
  | "aprobada"
  | "rechazada";

const MAXIMO_MB = 10;

export default function SolicitarVerificacion({ usuarioId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>("inicial");
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniReverso, setDniReverso] = useState<File | null>(null);
  const [selfieDni, setSelfieDni] = useState<File | null>(null);

  const [mayorEdad, setMayorEdad] = useState(false);
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);

  async function comprobarSolicitud() {
    setCargando(true);
    setMensaje("");

    const { data: solicitud, error } = await supabase
      .from("solicitudes_verificacion")
      .select("estado")
      .eq("user_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMensaje("No pudimos consultar tu solicitud.");
      setCargando(false);
      return;
    }

    if (solicitud?.estado === "pendiente") {
      setEstado("pendiente");
    } else if (solicitud?.estado === "aprobada") {
      setEstado("aprobada");
    } else if (solicitud?.estado === "rechazada") {
      setEstado("rechazada");
    } else {
      setEstado("inicial");
    }

    setCargando(false);
  }

  function archivoValido(archivo: File | null) {
    if (!archivo) {
      return false;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    return (
      tiposPermitidos.includes(archivo.type) &&
      archivo.size <= MAXIMO_MB * 1024 * 1024
    );
  }

  async function subirArchivo(archivo: File, nombre: string) {
    const extensiones: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensiones[archivo.type];

    const ruta = `${usuarioId}/${crypto.randomUUID()}-${nombre}.${extension}`;

    const { error } = await supabase.storage
      .from("verificacion-identidad")
      .upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false,
      });

    if (error) {
      throw new Error("No pudimos subir uno de los documentos.");
    }

    return ruta;
  }

  async function enviarSolicitud(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setMensaje("");

    if (!dniFrente || !dniReverso || !selfieDni) {
      setMensaje("Tenés que adjuntar las tres fotografías.");
      return;
    }

    if (
      !archivoValido(dniFrente) ||
      !archivoValido(dniReverso) ||
      !archivoValido(selfieDni)
    ) {
      setMensaje(
        "Los archivos deben ser JPG, PNG o WEBP y pesar como máximo 10 MB cada uno."
      );
      return;
    }

    if (!mayorEdad || !aceptaCondiciones) {
      setMensaje(
        "Tenés que confirmar que sos mayor de 18 años y aceptar las condiciones."
      );
      return;
    }

    setCargando(true);

    try {
      // Consultar el nombre de usuario para preparar la redirección.
      const { data: perfil, error: errorPerfil } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", usuarioId)
        .single();

      if (errorPerfil || !perfil?.username) {
        throw new Error(
          "No pudimos encontrar tu perfil para completar la solicitud."
        );
      }

      // Subir los tres documentos al almacenamiento privado.
      const frentePath = await subirArchivo(
        dniFrente,
        "dni-frente"
      );

      const reversoPath = await subirArchivo(
        dniReverso,
        "dni-reverso"
      );

      const selfiePath = await subirArchivo(
        selfieDni,
        "selfie-dni"
      );

      // Registrar la solicitud.
      const { error } = await supabase
        .from("solicitudes_verificacion")
        .insert({
          user_id: usuarioId,
          estado: "pendiente",
          dni_frente_path: frentePath,
          dni_reverso_path: reversoPath,
          selfie_dni_path: selfiePath,
          mayor_edad_confirmada: true,
          condiciones_aceptadas: true,
        });

      if (error) {
        throw new Error(
          "Los documentos se subieron, pero no pudimos registrar la solicitud. Intentá nuevamente más tarde."
        );
      }

      // Actualizar el estado y regresar al perfil.
      setEstado("pendiente");

      router.push(
        `/perfil/${encodeURIComponent(perfil.username)}`
      );

    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al enviar tu solicitud."
      );

      setCargando(false);
    }
  }

  useEffect(() => {
    comprobarSolicitud();
  }, [usuarioId]);

  if (cargando) {
    return (
      <p className="text-sm text-[#111111]">
        Consultando verificación...
      </p>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-5 rounded-2xl bg-white p-5 text-[#111111]">

      {estado === "pendiente" && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-100 p-4 text-[#111111]">
          Tu solicitud está pendiente de revisión.
        </div>
      )}

      {estado === "aprobada" && (
        <div className="rounded-xl border border-sky-300 bg-sky-100 p-4 text-[#111111]">
          ✓ Tu perfil está verificado.
        </div>
      )}

      {(estado === "inicial" || estado === "rechazada") && (
        <form onSubmit={enviarSolicitud} className="space-y-5">

          {estado === "rechazada" && (
            <div className="rounded-xl border border-red-300 bg-red-100 p-4 text-[#111111]">
              Tu solicitud anterior fue rechazada. Podés presentar una nueva solicitud.
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-[#111111]">
              Verificación de identidad
            </h3>

            <p className="mt-2 text-sm text-[#333333]">
              Para verificar tu cuenta necesitamos comprobar tu identidad
              y confirmar que sos mayor de 18 años.
            </p>
          </div>

          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                1. DNI de frente
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) =>
                  setDniFrente(e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-[#111111] file:mr-4 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2 file:font-semibold file:text-[#111111] file:hover:bg-gray-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                2. DNI del reverso
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) =>
                  setDniReverso(e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-[#111111] file:mr-4 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2 file:font-semibold file:text-[#111111] file:hover:bg-gray-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">
                3. Selfie sosteniendo tu DNI
              </label>

              <p className="mb-2 text-xs text-[#333333]">
                Debés sostener el DNI junto a tu rostro. La cara y el
                documento tienen que verse claramente, con buena
                iluminación y sin filtros.
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) =>
                  setSelfieDni(e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-[#111111] file:mr-4 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4 file:py-2 file:font-semibold file:text-[#111111] file:hover:bg-gray-300"
              />
            </div>

            <p className="text-xs text-[#333333]">
              Formatos permitidos: JPG, PNG y WEBP. Máximo 10 MB por imagen.
            </p>

          </div>

          <div className="space-y-4 border-t border-gray-300 pt-5">

            <label className="flex items-start gap-3 text-sm text-[#111111]">
              <input
                type="checkbox"
                checked={mayorEdad}
                onChange={(e) => setMayorEdad(e.target.checked)}
                required
                className="mt-1 accent-black"
              />

              <span>
                Confirmo que soy mayor de 18 años.
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-[#111111]">
              <input
                type="checkbox"
                checked={aceptaCondiciones}
                onChange={(e) =>
                  setAceptaCondiciones(e.target.checked)
                }
                required
                className="mt-1 accent-black"
              />

              <span>
                Confirmo que los documentos enviados me pertenecen
                y acepto las condiciones del proceso de verificación.
              </span>
            </label>

          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl border border-gray-300 bg-gray-200 px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar solicitud de verificación
          </button>

        </form>
      )}

      {mensaje && (
        <p className="text-sm font-medium text-[#111111]">
          {mensaje}
        </p>
      )}

    </div>
  );
}
