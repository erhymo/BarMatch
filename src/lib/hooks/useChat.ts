import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatThread, MessageSender } from '../models';
import { ChatService } from '../services';

/**
 * React hook for managing chat threads
 * Wraps ChatService with React state management
 */
export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load threads from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadedThreads = ChatService.loadThreads(localStorage);
	    // eslint-disable-next-line react-hooks/set-state-in-effect
	    setThreads(loadedThreads);
	    setIsInitialized(true);
  }, []);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    ChatService.saveThreads(threads, localStorage);
  }, [threads, isInitialized]);

  /**
   * Get or create a thread between a user and a bar
   */
  const getOrCreateThread = useCallback(
    (barId: string, barName: string, userId: string, userName: string): ChatThread => {
      const existingThread = ChatService.getThreadBetween(userId, barId, threads);
      
      if (existingThread) {
        return existingThread;
      }

      const newThread = ChatService.createThread(barId, barName, userId, userName);
      setThreads((prev) => [...prev, newThread]);
      return newThread;
    },
    [threads]
  );

  /**
   * Send a message in a thread
   */
  const sendMessage = useCallback(
    (
      threadId: string,
      sender: MessageSender,
      senderName: string,
      messageText: string
    ) => {
      const message = ChatService.createMessage(threadId, sender, senderName, messageText);

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id === threadId) {
            return ChatService.addMessageToThread(thread, message);
          }
          return thread;
        })
      );
    },
    []
  );

  /**
   * Mark a thread as read
   */
  const markAsRead = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return ChatService.markThreadAsRead(thread);
        }
        return thread;
      })
    );
  }, []);

  /**
   * Close a thread
   */
  const closeThread = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return ChatService.updateThreadStatus(thread, 'closed');
        }
        return thread;
      })
    );
  }, []);

  /**
   * Reopen a thread
   */
  const reopenThread = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          return ChatService.updateThreadStatus(thread, 'open');
        }
        return thread;
      })
    );
  }, []);

  /**
   * Get threads for a specific bar
   */
  const getThreadsForBar = useCallback(
    (barId: string) => {
      return ChatService.getThreadsForBar(barId, threads);
    },
    [threads]
  );

  /**
   * Get a specific thread
   */
  const getThread = useCallback(
    (threadId: string) => {
      return ChatService.getThread(threadId, threads);
    },
    [threads]
  );

  /**
   * Get sorted threads (most recent first)
   */
  const sortedThreads = useMemo(() => {
    return ChatService.sortThreadsByActivity(threads);
  }, [threads]);

  return {
    threads: sortedThreads,
    getOrCreateThread,
    sendMessage,
    markAsRead,
    closeThread,
    reopenThread,
    getThreadsForBar,
    getThread,
  };
}

