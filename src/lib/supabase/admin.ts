
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan las variables de entorno de Supabase.");
  }

  // Diagnóstico temporal: comprobar el rol de la clave administrativa.
  const partesClave = serviceRoleKey.split(".");
  const payload = partesClave[1];

  if (!payload) {
    throw new Error("La clave administrativa de Supabase no tiene un formato JWT válido.");
  }

  const datosClave = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  );

  console.log("ADMIN JWT ROLE:", datosClave.role);
  console.log("SUPABASE URL:", supabaseUrl);

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
