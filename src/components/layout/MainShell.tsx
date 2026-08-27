'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useI18n } from '@/context/I18nContext';
import { CopilotContext } from '@/core/domain/CopilotContext';

export const MainShell: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    activeChannelId,
    setActiveChannelId,
    channels,
    messages,
    isLoading,
    hasMore,
    searchQuery,
    setSearchQuery,
    searchResults,
    sendMessage,
    loadEarlierMessages,
    clearSearch,
    copilotQuery
  } = useChat();
  const { locale, setLocale, t } = useI18n();

  // Local state for Copilot Q&A history
  const [copilotHistory, setCopilotHistory] = useState<Array<{
    query: string;
    answer: string;
    citations: CopilotContext[];
    isAuthorized: boolean;
  }>>([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');
  
  // States for responsive mobile drawers
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileCopilotOpen, setIsMobileCopilotOpen] = useState(false);

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = data.get('text') as string;
    if (text && text.trim()) {
      sendMessage(text.trim());
      e.currentTarget.reset();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchText.trim()) {
      setSearchQuery(localSearchText.trim());
    } else {
      clearSearch();
    }
  };

  const handleClearSearch = () => {
    setLocalSearchText('');
    clearSearch();
  };

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim() || isCopilotLoading) return;

    const query = copilotInput.trim();
    setCopilotInput('');
    setIsCopilotLoading(true);

    try {
      const result = await copilotQuery(query);
      setCopilotHistory(prev => [
        ...prev,
        {
          query,
          answer: result.answer,
          citations: result.citations,
          isAuthorized: result.isAuthorized
        }
      ]);
    } catch (err) {
      console.error('Copilot query failed:', err);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const activeChannel = channels.find(c => c.rw_id === activeChannelId);

  // Render highlighted search messages if search query is active
  const isSearchActive = searchQuery.length > 0;
  const displayedMessages = isSearchActive ? searchResults : messages;

  return (
    <div className="flex h-screen w-full bg-gray-very-light text-text-dark overflow-hidden font-sans">
      {/* Backdrop for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`w-72 bg-navy-blue text-white flex flex-col justify-between border-r border-navy-blue fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 flex-1 flex flex-col overflow-y-auto">
          {/* Header & Lang Selector */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-xl text-purple-light tracking-wide">{t('title')}</h2>
            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          {/* Canales */}
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-gray-medium uppercase tracking-widest mb-3">
              Canales
            </h3>
            <nav className="space-y-1.5">
              {channels.map((chan) => (
                <button
                  key={chan.rw_id}
                  onClick={() => {
                    setActiveChannelId(chan.rw_id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    activeChannelId === chan.rw_id
                      ? 'bg-purple-primary text-white shadow-md'
                      : 'text-gray-medium hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="truncate"># {chan.rw_name}</span>
                  {chan.rw_is_private && (
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-semibold ml-2">
                      [RLS]
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Perfil & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/10 flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-primary flex items-center justify-center font-bold text-sm text-white uppercase shadow-inner">
              {user?.rw_full_name ? user.rw_full_name.slice(0, 2) : ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user?.rw_full_name}</p>
              <p className="text-xs text-gray-medium truncate">{user?.rw_email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] bg-purple-soft/20 text-purple-light px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {user?.rw_role}
            </span>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition cursor-pointer"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* Zona 2: Chat Principal (Centro) */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col justify-between bg-gray-very-light min-w-0">
        {/* Cabecera con Buscador */}
        <header className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-light bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto min-w-0">
            <div className="flex items-center min-w-0">
              {/* Botón menú mobile */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden mr-2 p-1.5 rounded-lg hover:bg-gray-light text-text-dark focus:outline-none cursor-pointer"
                aria-label="Open sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="min-w-0">
                <h2 className="font-bold text-base sm:text-lg text-text-dark truncate">
                  # {activeChannel ? activeChannel.rw_name : 'canal'}
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-medium">
                  {activeChannel?.rw_is_private ? 'Canal Privado' : 'Canal Público'} • RLS
                </p>
              </div>
            </div>

            {/* Botón mobile copilot */}
            <button
              onClick={() => setIsMobileCopilotOpen(true)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-light text-purple-primary focus:outline-none cursor-pointer ml-2"
              aria-label="Open copilot"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="3.5" r="1.5" fill="currentColor" />
                <rect x="11.2" y="5" width="1.6" height="2" fill="currentColor" />
                <rect x="1.5" y="10" width="1.8" height="5" rx="0.9" fill="currentColor" />
                <rect x="20.7" y="10" width="1.8" height="5" rx="0.9" fill="currentColor" />
                <rect x="3" y="7" width="18" height="11" rx="4.5" fill="currentColor" />
                <path d="M9 17.5l2.5 3v-3h-2.5z" fill="currentColor" />
                <circle cx="8" cy="11.5" r="1.8" fill="white" />
                <circle cx="16" cy="11.5" r="1.8" fill="white" />
                <path d="M10 14a2 2 0 004 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Buscador de Mensajes */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder={t('search')}
                value={localSearchText}
                onChange={(e) => setLocalSearchText(e.target.value)}
                className="w-full sm:w-44 md:w-60 bg-gray-very-light border border-gray-light rounded-xl px-4 py-2 text-xs text-text-dark placeholder-gray-medium focus:outline-none focus:border-purple-primary transition-all"
              />
              {isSearchActive && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2 text-gray-medium hover:text-text-dark text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-purple-primary hover:bg-purple-light text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Buscar
            </button>
          </form>
        </header>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Keyset pagination trigger */}
          {!isSearchActive && hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadEarlierMessages}
                disabled={isLoading}
                className="text-xs text-purple-primary hover:text-purple-light bg-purple-primary/5 hover:bg-purple-primary/10 border border-purple-primary/20 px-4 py-2 rounded-xl font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isLoading ? 'Cargando...' : 'Cargar mensajes anteriores'}
              </button>
            </div>
          )}

          {displayedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-sm text-gray-medium py-10">
              {t('noMessages')}
            </div>
          ) : (
            displayedMessages.map((m) => (
              <div
                key={m.rw_id}
                className={`flex flex-col space-y-1 max-w-[80%] ${
                  m.rw_user_id === user?.rw_id ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Meta details */}
                <div className="flex items-center space-x-2 text-[10px] text-gray-medium">
                  <span className="font-bold text-text-dark/80">{m.userFullName}</span>
                  <span>•</span>
                  <span>
                    {m.rw_created_at
                      ? new Date(m.rw_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>

                {/* Bubble content */}
                <div
                  className={`p-3 rounded-2xl shadow-sm border ${
                    m.rw_user_id === user?.rw_id
                      ? 'bg-purple-primary text-white border-purple-primary'
                      : 'bg-white text-text-dark border-gray-light'
                  }`}
                >
                  {isSearchActive ? (
                    // Highlight rendering
                    <p
                      className="text-sm font-normal break-words"
                      dangerouslySetInnerHTML={{ __html: m.rw_content }}
                    />
                  ) : (
                    <p className="text-sm font-normal break-words">{m.rw_content}</p>
                  )}
                </div>

                {/* Status indicators */}
                {m.status && (
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider ${
                      m.status === 'pending'
                        ? 'text-gray-medium animate-pulse'
                        : m.status === 'failed'
                        ? 'text-red-500 font-bold'
                        : 'text-purple-light'
                    }`}
                  >
                    {m.status === 'pending'
                      ? 'Enviando...'
                      : m.status === 'failed'
                      ? 'No enviado (Sin permisos RLS)'
                      : 'Enviado'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input de Mensaje */}
        <div className="p-4 border-t border-gray-light bg-white">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              name="text"
              required
              placeholder={t('writeMessage')}
              className="flex-1 bg-gray-very-light border border-gray-light rounded-xl px-4 py-3 text-sm text-text-dark placeholder-gray-medium focus:outline-none focus:border-purple-primary focus:bg-white transition-all shadow-inner"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-purple-primary hover:bg-purple-light text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              Enviar
            </button>
          </form>
        </div>
      </main>

      {/* Backdrop for mobile copilot panel */}
      {isMobileCopilotOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileCopilotOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* Zona 3: Panel Copiloto (Derecha) */}
      {/* ========================================================================= */}
      <aside className={`w-80 border-l border-gray-light p-5 flex flex-col justify-between bg-white overflow-hidden shadow-xl fixed lg:static inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileCopilotOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex-1 flex flex-col overflow-y-auto space-y-4">
          <div className="border-b border-gray-light pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-purple-primary text-base flex items-center space-x-2">
                <span>{t('copilotTitle')}</span>
              </h3>
              <p className="text-xs text-gray-medium mt-1">
                Búsqueda Vectorial RAG aislada por RLS.
              </p>
            </div>
            {/* Close button for mobile copilot view */}
            <button
              onClick={() => setIsMobileCopilotOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-light text-gray-medium focus:outline-none cursor-pointer"
              aria-label="Close copilot"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Historial RAG */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {copilotHistory.map((item, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-xl bg-gray-very-light border border-gray-light">
                <div className="text-[10px] text-gray-medium font-bold uppercase tracking-wider">
                  {`Pregunta: "${item.query}"`}
                </div>
                <p className="text-xs text-text-dark font-medium leading-relaxed">
                  {item.answer}
                </p>

                {/* Badge de Seguridad si no está autorizado */}
                {!item.isAuthorized && (
                  <div className="text-[9px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center space-x-1.5 border border-red-500/20">
                    <span>[!]</span>
                    <span>Acceso Restringido (RLS)</span>
                  </div>
                )}

                {/* Citas */}
                {item.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-light/60">
                    <span className="text-[9px] font-bold text-purple-primary uppercase tracking-widest block mb-1">
                      {t('citations')} ({item.citations.length})
                    </span>
                    <div className="space-y-1">
                      {item.citations.map((cite: CopilotContext, cidx: number) => (
                        <div
                          key={cidx}
                          className="text-[9px] text-text-dark bg-white border border-gray-light/80 p-1.5 rounded flex flex-col"
                        >
                          <span className="font-bold text-purple-soft/95">
                            [{cite.messageId} | {cite.authorName} | #{cite.channelName}]
                          </span>
                          <span className="text-gray-medium italic mt-0.5 truncate">
                            {`"${cite.content}"`}
                          </span>
                        </div>  
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {copilotHistory.length === 0 && (
              <div className="text-center text-xs text-gray-medium py-10">
                Pregúntale al Copiloto sobre información específica de tus canales autorizados.
              </div>
            )}
          </div>
        </div>

        {/* Input del Copiloto */}
        <div className="pt-4 border-t border-gray-light bg-white mt-4">
          <form onSubmit={handleCopilotSubmit} className="flex flex-col space-y-2">
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              disabled={isCopilotLoading}
              placeholder={t('copilotPlaceholder')}
              className="w-full bg-gray-very-light border border-gray-light rounded-xl px-4 py-2.5 text-xs text-text-dark placeholder-gray-medium focus:outline-none focus:border-purple-primary transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isCopilotLoading || !copilotInput.trim()}
              className="w-full py-2 px-4 rounded-xl bg-purple-primary hover:bg-purple-light text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isCopilotLoading ? 'Procesando...' : t('askCopilot')}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};