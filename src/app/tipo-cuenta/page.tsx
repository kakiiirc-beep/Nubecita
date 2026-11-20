import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TipoCuenta() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.username) {
    redirect(`/perfil/${perfil.username}`);
  }

  redirect("/editar-perfil");
}