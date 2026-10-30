import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

export type AppLanguage = 'english' | 'marathi';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: keyof typeof translations.english) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('english');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('sync_app_language');
        if (savedLang) {
          setLanguageState(savedLang as AppLanguage);
        }
      } catch (e) {
        console.error('Failed to load language preference', e);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: AppLanguage) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('sync_app_language', lang);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  const t = (key: keyof typeof translations.english): string => {
    const dict = translations[language] || translations.english;
    return dict[key] || translations.english[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};
