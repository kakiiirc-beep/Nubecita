export default function CuentaSuspendidaPage() {
  return (
    <main className="min-h-screen bg-[#080d1c] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="text-6xl mb-6">☁️</div>

        <h1 className="text-2xl font-bold text-white mb-4">
          Cuenta suspendida
        </h1>

        <p className="text-gray-300 leading-relaxed mb-6">
          Tu cuenta de NUBECITA se encuentra temporalmente suspendida.
          No podés acceder a las funciones de la plataforma mientras
          dure esta medida.
        </p>

        <p className="text-sm text-gray-400">
          Si creés que se trata de un error, comunicate con el equipo
          de administración de NUBECITA.
        </p>
      </div>
    </main>
  );
}