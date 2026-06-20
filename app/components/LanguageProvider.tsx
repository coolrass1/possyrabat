'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/lib/translations/en';
import { fr } from '@/lib/translations/fr';
import { getTranslationValue } from '@/lib/translations/types';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('possyrabat_lang') as Language | null;
    if (saved === 'en' || saved === 'fr') {
      setLanguageState(saved);
    } else {
      // French is the default; only fall back to English for explicitly-English browsers.
      const browserLang = navigator.language || '';
      if (browserLang.toLowerCase().startsWith('en')) {
        setLanguageState('en');
      } else {
        setLanguageState('fr');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('possyrabat_lang', lang);
  };

  const t = (path: string): string => {
    const dict = language === 'fr' ? fr : en;
    return getTranslationValue(dict, path);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
