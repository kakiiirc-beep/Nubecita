import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SolicitarVerificacion from "@/components/SolicitarVerificacion";

export default async function PaginaSolicitarVerificacion() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-white">
          Solicitar verificación
        </h1>

        <SolicitarVerificacion usuarioId={user.id} />
      </div>
    </main>
  );
}