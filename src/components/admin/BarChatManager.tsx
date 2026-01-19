'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatThread } from '@/lib/models';
import { useChat } from '@/lib/hooks';
import { ChatService } from '@/lib/services';
import { useToast } from '@/contexts/ToastContext';

interface BarChatManagerProps {
  barId: string;
  barName: string;
}

export default function BarChatManager({ barId, barName }: BarChatManagerProps) {
  const { getThreadsForBar, sendMessage, markAsRead, closeThread, reopenThread, getThread } = useChat();
	  const { showToast } = useToast();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [barThreads, setBarThreads] = useState<ChatThread[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads for this bar
  useEffect(() => {
    const threads = getThreadsForBar(barId);
    // Calculate unread counts from bar's perspective
    const threadsWithUnread = threads.map((thread) => ({
      ...thread,
      unreadCount: ChatService.calculateUnreadCount(thread, 'bar'),
    }));
    setBarThreads(threadsWithUnread);
  }, [barId, getThreadsForBar]);

  // Update selected thread when messages change
  useEffect(() => {
    if (selectedThreadId) {
      const updatedThread = getThread(selectedThreadId);
      if (updatedThread) {
        const threadWithUnread = {
          ...updatedThread,
          unreadCount: ChatService.calculateUnreadCount(updatedThread, 'bar'),
        };
        setBarThreads((prev) =>
          prev.map((t) => (t.id === selectedThreadId ? threadWithUnread : t))
        );
      }
    }
  }, [selectedThreadId, getThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThreadId]);

  const selectedThread = barThreads.find((t) => t.id === selectedThreadId);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    markAsRead(threadId);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedThreadId) return;

    sendMessage(selectedThreadId, 'bar', barName, messageText.trim());
    setMessageText('');
	    showToast({
	      title: 'Svar sendt',
	      description: 'Meldingen er sendt til gjesten.',
	      variant: 'success',
	    });
  };

  const handleQuickReply = (reply: string) => {
    if (!selectedThreadId) return;
    sendMessage(selectedThreadId, 'bar', barName, reply);
	    showToast({
	      title: 'Svar sendt',
	      description: 'Hurtigsvar er sendt til gjesten.',
	      variant: 'success',
	    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const totalUnread = barThreads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          💬 Meldinger
          {totalUnread > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              {totalUnread}
            </span>
          )}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Håndter bordforespørsler og meldinger fra gjester
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
        {/* Thread List */}
        <div className="border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          {barThreads.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">Ingen meldinger ennå</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {barThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50
                           transition-colors ${
                             selectedThreadId === thread.id
                               ? 'bg-blue-50 dark:bg-blue-900/20'
                               : ''
                           }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {thread.userName}
                    </span>
                    {thread.unreadCount! > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {thread.messages.length > 0
                      ? thread.messages[thread.messages.length - 1].message
                      : 'Ingen meldinger'}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {new Date(thread.updatedAt).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-zinc-500 dark:text-zinc-400">
                Velg en samtale for å se meldinger
              </p>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'bar' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.sender === 'bar'
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === 'bar'
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
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Hurtigsvar:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickReply('Ja, det er ledig plass! Velkommen 😊')}
                    className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700
                             dark:text-green-300 rounded-lg text-sm hover:bg-green-200
                             dark:hover:bg-green-900/50 transition-colors"
                  >
                    ✅ Ja, ledig
                  </button>
                  <button
                    onClick={() =>
                      handleQuickReply('Dessverre fullt i dag. Prøv gjerne en annen dag!')
                    }
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700
                             dark:text-red-300 rounded-lg text-sm hover:bg-red-200
                             dark:hover:bg-red-900/50 transition-colors"
                  >
                    ❌ Fullt
                  </button>
                  <button
                    onClick={() => handleQuickReply('Ring oss på telefon for å reservere!')}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700
                             dark:text-blue-300 rounded-lg text-sm hover:bg-blue-200
                             dark:hover:bg-blue-900/50 transition-colors"
                  >
                    📞 Ring oss
                  </button>
                </div>
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Skriv et svar..."
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

