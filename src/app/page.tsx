"use client";

import { useEffect, useState } from "react";

const translations = {
  es: {
    home: "Inicio",
    explore: "Explorar",
    live: "En vivo",
    models: "Modelos",
    login: "Ingresar",
    register: "Registrarse",
    subtitle: "ENTRETENIMIENTO EXCLUSIVO",
    title: "Descubrí un mundo",
    title2: "sin límites",
    description: "Descubrí transmisiones, creadores y contenido exclusivo en una experiencia internacional.",
    button: "EXPLORAR PLATAFORMA",
    sections: "Descubrí NUBECITA",
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
    footer: "Todos os direitos reservados."
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
      const browserLanguage = navigator.language
        .slice(0, 2);

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
    <main className="min-h-screen bg-[#12090d] text-white">

      <header className="flex flex-wrap items-center
        justify-between gap-4 border-b border-white/10
        px-6 py-5">

        <h1 className="text-3xl font-bold tracking-widest
          text-pink-300">
          NUBECITA
        </h1>

        <nav className="flex flex-wrap gap-5">
          <a href="#">{t.home}</a>
          <a href="#">{t.explore}</a>
          <a href="#">{t.live}</a>
          <a href="#">{t.models}</a>
        </nav>

        <div className="flex flex-wrap items-center gap-3">

          <select
            value={language}
            onChange={(e) =>
              changeLanguage(e.target.value as Language)
            }
            className="rounded-lg border border-pink-400
              bg-[#24121b] px-3 py-2 text-white"
            aria-label="Choose language"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 English</option>
            <option value="pt">🇧🇷 Português</option>
            <option value="fr">🇫🇷 Français</option>
          </select>

          <button className="rounded-lg border
            border-pink-400 px-4 py-2">
            {t.login}
          </button>

          <button className="rounded-lg bg-pink-700
            px-4 py-2">
            {t.register}
          </button>

        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6
        py-28 text-center">

        <p className="mb-5 text-sm tracking-widest
          text-pink-300">
          {t.subtitle}
        </p>

        <h2 className="mb-6 text-5xl font-bold
          md:text-7xl">
          {t.title}
          <br />
          <span className="text-pink-400">
            {t.title2}
          </span>
        </h2>

        <p className="mx-auto mb-10 max-w-xl text-gray-400">
          {t.description}
        </p>

        <button className="rounded-xl bg-pink-700
          px-8 py-4 font-semibold">
          {t.button}
        </button>

      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">

        <h3 className="mb-8 text-3xl font-bold">
          {t.sections}
        </h3>

        <div className="grid gap-6 md:grid-cols-3">

          {[t.liveSection, t.modelsSection,
            t.exclusiveSection].map((item) => (

            <div key={item}
              className="rounded-2xl border
              border-pink-900 bg-[#24121b] p-8">

              <h4 className="text-xl font-semibold
                text-pink-300">
                {item}
              </h4>

            </div>
          ))}

        </div>
      </section>

      <footer className="border-t border-white/10
        px-6 py-8 text-center text-gray-500">
        NUBECITA © 2026 - {t.footer}
      </footer>

    </main>
  );
}