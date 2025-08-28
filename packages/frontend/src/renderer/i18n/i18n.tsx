import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, languageConfig, Translations } from './translations';

interface I18nContextType {
  language: Language;
  locale: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ru'); // Default to Russian

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('rivhit-language') as Language;
    if (saved && saved in translations) {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('rivhit-language', language);
    
    // Set document direction
    document.documentElement.dir = languageConfig[language].dir;
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextType = {
    language,
    locale: language,
    setLanguage,
    t: translations[language],
    dir: languageConfig[language].dir as 'ltr' | 'rtl',
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};