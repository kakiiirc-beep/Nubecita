
"use client";

import { useEffect, useState } from "react";
import ModelosDestacadas from "@/components/ModelosDestacadas";

const translations = {
  es: {
    home: "Inicio",
    explore: "Explorar",
    live: "En vivo",
    models: "Modelos",
    login: "Ingresar",
    register: "Registrarse",
    subtitle: "ENTRETENIMIENTO EXCLUSIVO",
    title: "Tu contenido, tus reglas,",
    title2: "tus ingresos",
    description: "Compartí contenido exclusivo, conectá con tus seguidores y monetizá tu creatividad en NUBECITA. Una plataforma creada para creadores de contenido.",
    button: "EXPLORAR PLATAFORMA",
    sections: "Descubrí todo lo que NUBECITA tiene para ofrecerte",
    liveSection: "Transmisiones en vivo",
    modelsSection: "Modelos destacadas",
    exclusiveSection: "Contenido exclusivo",
    footer: "Todos los derechos reservados."
  },
  en: {
    home: "Home",
    explore: "Explore",
    live: "Live",
    models: "Models",
    login: "Log in",
    register: "Sign up",
    subtitle: "EXCLUSIVE ENTERTAINMENT",
    title: "Discover a world",
    title2: "without limits",
    description: "Discover live streams, creators and exclusive content in an international experience.",
    button: "EXPLORE PLATFORM",
    sections: "Discover NUBECITA",
    liveSection: "Live streams",
    modelsSection: "Featured models",
    exclusiveSection: "Exclusive content",
    footer: "All rights reserved."
  },
  pt: {
    home: "Início",
    explore: "Explorar",
    live: "Ao vivo",
    models: "Modelos",
    login: "Entrar",
    register: "Cadastrar",
    subtitle: "ENTRETENIMENTO EXCLUSIVO",
    title: "Descubra um mundo",
    title2: "sem limites",
    description: "Descubra transmissões ao vivo, criadores e conteúdo exclusivo em uma experiência internacional.",
    button: "EXPLORAR PLATAFORMA",
    sections: "Descubra NUBECITA",
    liveSection: "Transmissões ao vivo",
    modelsSection: "Modelos em destaque",
    exclusiveSection: "Conteúdo exclusivo",
    footer: "All rights reserved."
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    live: "En direct",
    models: "Modèles",
    login: "Connexion",
    register: "Inscription",
    subtitle: "DIVERTISSEMENT EXCLUSIF",
    title: "Découvrez un monde",
    title2: "sans limites",
    description: "Découvrez des diffusions en direct, des créateurs et du contenu exclusif.",
    button: "EXPLORER LA PLATEFORME",
    sections: "Découvrez NUBECITA",
    liveSection: "Diffusions en direct",
    modelsSection: "Modèles à la une",
    exclusiveSection: "Contenu exclusif",
    footer: "Tous droits réservés."
  }
};

type Language = keyof typeof translations;

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");

  useEffect(() => {
    const saved = localStorage.getItem("nubecita-language");

    if (saved && saved in translations) {
      setLanguage(saved as Language);
    } else {
      const browserLanguage = navigator.language.slice(0, 2);

      if (browserLanguage in translations) {
        setLanguage(browserLanguage as Language);
      }
    }
  }, []);

  function changeLanguage(value: Language) {
    setLanguage(value);
    localStorage.setItem("nubecita-language", value);
  }

  const t = translations[language];

  return (
    <main className="relative isolate min-h-screen bg-white text-slate-900">

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 10% 15%, rgba(125, 211, 252, 0.35), transparent 35%),
            radial-gradient(ellipse at 85% 25%, rgba(186, 230, 253, 0.45), transparent 35%),
            radial-gradient(ellipse at 50% 85%, rgba(125, 211, 252, 0.25), transparent 40%)
          `,
        }}
      />

      <div className="relative z-10">

        <header className="relative flex flex-col items-center gap-5 border-b border-slate-200 px-6 py-7">

          <div className="absolute right-6 top-6">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm text-slate-900"
              aria-label="Choose language"
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇺🇸 English</option>
              <option value="pt">🇧🇷 Português</option>
              <option value="fr">🇫🇷 Français</option>
            </select>
          </div>

          <a
            href="/registro"
            className="text-4xl font-bold tracking-widest text-sky-600 transition hover:text-sky-500"
          >
            NUBECITA
          </a>

          <div className="flex flex-wrap justify-center gap-3">

            <a
              href="#modelos"
              className="rounded-xl border border-sky-400 bg-white px-6 py-3 font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Modelos destacadas
            </a>

            <a
              href="/registro"
              className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-400"
            >
              Monetizá tu contenido
            </a>

          </div>

        </header>

        <section className="mx-auto max-w-6xl px-6 pt-44 pb-28 text-center">

          <p className="mb-5 text-sm tracking-widest text-sky-600">
            {t.subtitle}
          </p>

          <h2 className="mb-6 text-5xl font-bold md:text-7xl">
            {t.title}
            <br />
            <span className="text-sky-500">
              {t.title2}
            </span>
          </h2>

          <p className="mx-auto mb-10 max-w-xl text-slate-600">
            {t.description}
          </p>

          <a
  href="/explorar"
  className="inline-block rounded-xl bg-sky-500 px-8 py-4 font-semibold text-white transition hover:bg-sky-400"
>
  {t.button}
</a>

        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">

          <h3 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Descubrí todo lo que NUBECITA tiene para ofrecerte
          </h3>

          <div className="grid gap-8 md:grid-cols-3">

            <div className="rounded-2xl border border-sky-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 text-5xl"></div>

              <h4 className="mb-3 text-xl font-bold text-sky-700">
                Contenido exclusivo
              </h4>

              <p className="leading-relaxed text-slate-600">
                Compartí fotos y videos exclusivos con las personas que siguen tu contenido.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 text-5xl"></div>

              <h4 className="mb-3 text-xl font-bold text-sky-700">
                Monetizá tu contenido
              </h4>

              <p className="leading-relaxed text-slate-600">
                Generá ingresos compartiendo contenido y ofreciendo planes exclusivos a tus seguidores.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 text-5xl">💙</div>

              <h4 className="mb-3 text-xl font-bold text-sky-700">
                Tu comunidad
              </h4>

              <p className="leading-relaxed text-slate-600">
                Creá tu propia comunidad, conectá con tus seguidores y hacé crecer tu perfil.
              </p>
            </div>

          </div>
        </section>

        <ModelosDestacadas />

        <footer className="border-t border-slate-200 px-6 py-8 text-center text-slate-500">
          NUBECITA © 2026 - {t.footer}
        </footer>

      </div>
    </main>
  );
}
