import { createContext, useContext, useMemo, useState } from "react";
import { LANGS, translations } from "./translations.js";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("agrisense_lang") || "en";
  });

  const value = useMemo(() => {
    const dict = translations[lang] || translations.en;
    const t = (key) => dict[key] || translations.en[key] || key;

    const setLanguage = (next) => {
      setLang(next);
      localStorage.setItem("agrisense_lang", next);
    };

    return { lang, setLanguage, t, languages: LANGS };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

