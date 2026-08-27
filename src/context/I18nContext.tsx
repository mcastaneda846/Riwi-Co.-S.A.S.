'use client';
import React, { createContext, useContext, useState } from 'react';

type Locale = 'es' | 'en';

const translations = {
  es: {
    title: 'Riwi Messenger',
    subtitle: 'Plataforma de Mensajería Interna RLS',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    login: 'Iniciar Sesión',
    loggingIn: 'Iniciando Sesión...',
    logout: 'Cerrar Sesión',
    role: 'Rol',
    activeUser: 'Usuario Activo',
    search: 'Buscar mensajes...',
    copilotTitle: 'Copiloto de IA (RAG)',
    copilotPlaceholder: 'Pregúntale al Copiloto sobre los canales...',
    askCopilot: 'Consultar',
    noMessages: 'No hay mensajes en este canal.',
    writeMessage: 'Escribe un mensaje...',
    sending: 'Enviando...',
    citations: 'Citas',
    denied: 'Acceso Denegado / Sin Permisos',
    unauthorized: 'No autorizado',
    invalidCredentials: 'Credenciales inválidas',
    generalChannel: 'general',
    internalDevChannel: 'desarrollo-interno',
  },
  en: {
    title: 'Riwi Messenger',
    subtitle: 'Internal RLS Messaging Platform',
    email: 'Email Address',
    password: 'Password',
    login: 'Log In',
    loggingIn: 'Logging In...',
    logout: 'Log Out',
    role: 'Role',
    activeUser: 'Active User',
    search: 'Search messages...',
    copilotTitle: 'AI Copilot (RAG)',
    copilotPlaceholder: 'Ask the Copilot about the channels...',
    askCopilot: 'Ask',
    noMessages: 'No messages in this channel.',
    writeMessage: 'Type a message...',
    sending: 'Sending...',
    citations: 'Citations',
    denied: 'Access Denied / No Permissions',
    unauthorized: 'Unauthorized',
    invalidCredentials: 'Invalid credentials',
    generalChannel: 'general',
    internalDevChannel: 'desarrollo-interno',
  }
};

export type TranslationKeys = keyof typeof translations['es'];

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('es');

  const t = (key: TranslationKeys): string => {
    return translations[locale][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
};
