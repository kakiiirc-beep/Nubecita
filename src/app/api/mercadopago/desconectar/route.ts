
import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Comprobar la sesión actual de NUBECITA.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Tu sesión expiró. Volvé a iniciar sesión." },
        { status: 401 }
      );
    }

    // Comprobar que el usuario sea una modelo.
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilError || perfil?.role !== "modelo") {
      return NextResponse.json(
        { error: "No se pudo verificar tu perfil de modelo." },
        { status: 403 }
      );
    }

    // Obtener la contraseña enviada por el formulario.
    const body = await request.json().catch(() => null);
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!password || password.length > 1024) {
      return NextResponse.json(
        { error: "Ingresá tu contraseña de NUBECITA." },
        { status: 400 }
      );
    }

    // Validar las credenciales necesarias.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Falta configurar una credencial del servidor." },
        { status: 500 }
      );
    }

    // Verificar la contraseña sin modificar la sesión actual.
    const supabaseAuth = createSupabaseClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: passwordData, error: passwordError } =
      await supabaseAuth.auth.signInWithPassword({
        email: user.email,
        password,
      });

    if (passwordError || passwordData.user?.id !== user.id) {
      return NextResponse.json(
        { error: "La contraseña es incorrecta." },
        { status: 401 }
      );
    }

    // Crear el cliente administrativo del servidor.
    const admin = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Eliminar exclusivamente la conexión de esta modelo.
    const { error: deleteError } = await admin
      .from("mercadopago_conexiones")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "[Mercado Pago] Error al desconectar:",
        deleteError.message
      );

      return NextResponse.json(
        { error: "No se pudo desvincular Mercado Pago." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Mercado Pago] Error al desconectar:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al desvincular Mercado Pago." },
      { status: 500 }
    );
  }
}
