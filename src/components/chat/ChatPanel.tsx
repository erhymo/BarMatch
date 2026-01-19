'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatThread } from '@/lib/models';
import { useChat } from '@/lib/hooks';
import { useToast } from '@/contexts/ToastContext';

interface ChatPanelProps {
  barId: string;
  barName: string;
  onClose: () => void;
}

export default function ChatPanel({ barId, barName, onClose }: ChatPanelProps) {
  const { getOrCreateThread, sendMessage, markAsRead, getThread } = useChat();
	  const { showToast } = useToast();
  const [messageText, setMessageText] = useState('');
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock user - in real app, this would come from auth context
  const mockUserId = 'user-1';
  const mockUserName = 'Gjest';

  // Initialize or get existing thread
  useEffect(() => {
    const thread = getOrCreateThread(barId, barName, mockUserId, mockUserName);
    setCurrentThread(thread);
    markAsRead(thread.id);
  }, [barId, barName, getOrCreateThread, markAsRead, mockUserId, mockUserName]);

  // Update thread when messages change
  useEffect(() => {
    if (currentThread) {
      const updatedThread = getThread(currentThread.id);
      if (updatedThread) {
        setCurrentThread(updatedThread);
      }
    }
  }, [currentThread?.id, getThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !currentThread) return;

    sendMessage(currentThread.id, 'user', mockUserName, messageText.trim());
    setMessageText('');
	    showToast({
	      title: 'Melding sendt',
	      description: `Meldingen din er sendt til ${barName}.`,
	      variant: 'success',
	    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentThread) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="bg-white dark:bg-zinc-900 w-full sm:max-w-lg sm:rounded-2xl shadow-2xl
                   flex flex-col max-h-[90vh] sm:max-h-[600px]"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-zinc-200
                     dark:border-zinc-800"
        >
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {barName}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Send melding eller book bord
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Lukk chat"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {currentThread.messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400 mb-2">
                Ingen meldinger ennå
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Send en melding for å starte samtalen
              </p>
            </div>
          ) : (
            currentThread.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === 'user'
                        ? 'text-blue-100'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('no-NO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Skriv en melding..."
              className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50
                       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium
                       hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

