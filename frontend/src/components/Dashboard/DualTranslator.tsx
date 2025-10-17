import React, { useEffect, useRef, useState } from 'react';
import { useTranslator } from '../../hooks/useTranslator';
import RoomJoin from './RoomJoin';

const DualTranslator: React.FC = () => {
  const {
    originalText,
    translatedText,
    isRecording,
    status,
    toggleRecording,
    connectionStatus,
    recognitionLang,
    setRecognitionLang,
    websocketRef,
    setOriginalText,
    performTranslation
  } = useTranslator();

  const dialects = ['de-DE', 'de-AT', 'ru-RU'];
  const dialectNames = {
    'de-DE': '🇩🇪 Deutsch',
    'de-AT': '🇦🇹 Österreich',
    'ru-RU': '🇷🇺 Russisch'
  };

  const [dialect, setDialect] = useState(recognitionLang);
  const [dialectIndex, setDialectIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showRoomJoin, setShowRoomJoin] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    speaker: string;
    lang: string;
    text: string;
    translation: string;
    timestamp: string;
  }>>([]);

  const leftPanelRef = useRef<HTMLTextAreaElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const handleJoinRoom = (code: string, name: string) => {
    setRoomCode(code);
    setUsername(name);

    if (websocketRef?.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'join_room',
        room: code,
        username: name
      }));
      setIsConnected(true);
    }
  };

  const switchDialect = () => {
    const nextIndex = (dialectIndex + 1) % dialects.length;
    setDialectIndex(nextIndex);
    const newDialect = dialects[nextIndex];
    setDialect(newDialect);
    setRecognitionLang(newDialect);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} kopiert`);
    } catch {
      alert('Fehler');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && !isRecording) {
        e.preventDefault();
        const nextIndex = (dialectIndex + 1) % dialects.length;
        setDialectIndex(nextIndex);
        const newDialect = dialects[nextIndex];
        setDialect(newDialect);
        setRecognitionLang(newDialect);
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialectIndex, isRecording]);

  useEffect(() => {
    if (translatedText && translatedText !== 'Übersetzung erscheint hier...' && originalText) {
      const newEntry = {
        speaker: username || (dialect.startsWith('ru') ? 'RU' : 'DE'),
        lang: dialect,
        text: originalText,
        translation: translatedText,
        timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      };
      setConversationHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text === originalText) return prev;
        return [...prev, newEntry];
      });
    }
  }, [translatedText]);

  useEffect(() => setDialect(recognitionLang), [recognitionLang]);
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = leftPanelRef.current.scrollHeight;
  }, [originalText]);
  useEffect(() => {
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight;
  }, [translatedText]);

  const pasteToOriginal = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOriginalText(text);
      performTranslation(text);
    } catch {
      alert('Einfügefehler');
    }
  };

  const wakeUpAPI = async () => {
    setIsWakingUp(true);
    setStatus('⏰ Backend wird aufgeweckt...');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/health`);

      if (response.ok) {
        setStatus('✅ Backend ist wach!');
        if (websocketRef?.current) {
          websocketRef.current.close();
        }
      } else {
        setStatus('❌ Backend antwortet nicht');
      }
    } catch (error) {
      setStatus('❌ Verbindungsfehler');
    } finally {
      setIsWakingUp(false);
    }
  };

  return (
    <>
      {!isConnected && showRoomJoin && (
        <RoomJoin 
          onJoin={handleJoinRoom} 
          onClose={() => setShowRoomJoin(false)} 
        />
      )}
      <div className="w-full h-screen flex flex-col bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600">
        <header className="flex justify-between items-center p-6 flex-wrap gap-3">
          <h1 className="text-white text-3xl font-bold">🎤 Dual Translator</h1>
          <div className="flex items-center gap-3">
            {/* API-Statusanzeigen */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <span className="text-white text-sm font-medium">API</span>
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus.ai ? 'bg-green-400' : 'bg-red-400'}`}
                title={connectionStatus.ai ? 'Backend verfügbar' : 'Backend nicht verfügbar'}
              />
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus.ws ? 'bg-green-400' : 'bg-red-400'}`}
                title={connectionStatus.ws ? 'WebSocket verbunden' : 'WebSocket getrennt'}
              />
            </div>

            {/* Aufweck-Button */}
            {!connectionStatus.ai && (
              <button
                onClick={wakeUpAPI}
                disabled={isWakingUp}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 rounded text-white text-xs font-semibold transition-all"
                title="Backend auf Render aufwecken"
              >
                {isWakingUp ? '⏳' : '⏰ Aufwecken'}
              </button>
            )}

            {/* Raum-Beitritts-Button - nur wenn Backend bereit ist */}
            {connectionStatus.ai && connectionStatus.ws && !isConnected && (
              <button
                onClick={() => setShowRoomJoin(true)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-semibold transition-all"
                title="Raum erstellen oder beitreten"
              >
                🚪 Raum beitreten
              </button>
            )}

            {/* Start/Stop-Button */}
            <button
              onClick={toggleRecording}
              className={`px-8 py-4 rounded-xl font-semibold text-white text-lg shadow-lg transition-all ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {isRecording ? '⏹️ Stoppen' : '▶️ Starten'}
            </button>
          </div>
          {/* Sprachauswahl */}
          <button
            onClick={switchDialect}
            className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30"
          >
            {dialectNames[dialect as keyof typeof dialectNames]}
          </button>
        </header>

        {/* Statusleiste */}
        <div className="px-6 pb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center text-white">
            <span>{status}</span>
            <span className="ml-3 text-sm opacity-70">
              {isConnected ? `Raum: ${roomCode} | ${username}` : '(Enter = Sprache | Leertaste = Aufnahme)'}
            </span>
          </div>
        </div>

        <main className="flex-1 flex gap-4 px-6 pb-6">
          {/* Linkes Panel - Original */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-semibold">🗣️ Original</h2>
              <div className="flex gap-2">
                <button
                  onClick={pasteToOriginal}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
                >
                  📋 Einfügen
                </button>
                <button
                  onClick={() => copyToClipboard(originalText, 'Original')}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
                >
                  📋 Kopieren
                </button>
              </div>
            </div>
            <textarea
              ref={leftPanelRef}
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'v') {
                  e.preventDefault();
                  pasteToOriginal();
                }
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  performTranslation(originalText);
                }
              }}
              placeholder="Sprechen Sie oder fügen Sie Text ein..."
              className="flex-1 bg-white/5 rounded-xl p-4 text-white text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {/* Rechtes Panel - Übersetzung */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-semibold">🌐 Übersetzung</h2>
              <button
                onClick={() => copyToClipboard(translatedText, 'Übersetzung')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
              >
                📋 Kopieren
              </button>
            </div>
            <div ref={rightPanelRef} className="flex-1 bg-white/5 rounded-xl p-4 overflow-y-auto">
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                {translatedText || 'Übersetzung erscheint hier...'}
              </p>
            </div>
          </div>
        </main>

        {/* Fußzeile - Gesprächsverlauf */}
        <footer className="bg-white/10 backdrop-blur-sm p-6 text-white">
          <h3 className="font-semibold mb-3 text-lg">🕐 Gesprächsverlauf</h3>
          <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
            {conversationHistory.length === 0 ? (
              <p className="text-white/50 text-center py-4">Verlauf ist leer</p>
            ) : (
              conversationHistory.map((msg, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3 border-l-4 border-white/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{msg.speaker}</span>
                    <span className="text-sm opacity-70">{msg.timestamp}</span>
                  </div>
                  <div className="text-base">
                    <p className="mb-1">{msg.text}</p>
                    <p className="text-white/80 italic">→ {msg.translation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </footer>
      </div>
    </>
  );
};

export default DualTranslator;