import {
  ChatThread,
  ChatMessage,
  MessageSender,
  CHAT_STORAGE_KEYS,
  ChatThreadStatus,
} from '../models';

/**
 * Chat Service
 * Platform-agnostic service for managing chat/messaging
 * Can be used in web, mobile (Capacitor), or any other platform
 */

export class ChatService {
  /**
   * Load all chat threads from storage
   */
  static loadThreads(storage: Storage): ChatThread[] {
    try {
      const threadsJson = storage.getItem(CHAT_STORAGE_KEYS.THREADS);
      return threadsJson ? JSON.parse(threadsJson) : [];
    } catch (error) {
      console.error('Error loading chat threads:', error);
      return [];
    }
  }

  /**
   * Save chat threads to storage
   */
  static saveThreads(threads: ChatThread[], storage: Storage): void {
    try {
      storage.setItem(CHAT_STORAGE_KEYS.THREADS, JSON.stringify(threads));
    } catch (error) {
      console.error('Error saving chat threads:', error);
    }
  }

  /**
   * Get a specific thread by ID
   */
  static getThread(threadId: string, threads: ChatThread[]): ChatThread | undefined {
    return threads.find((thread) => thread.id === threadId);
  }

  /**
   * Get all threads for a specific bar
   */
  static getThreadsForBar(barId: string, threads: ChatThread[]): ChatThread[] {
    return threads.filter((thread) => thread.barId === barId);
  }

  /**
   * Get thread between a user and a bar (if exists)
   */
  static getThreadBetween(
    userId: string,
    barId: string,
    threads: ChatThread[]
  ): ChatThread | undefined {
    return threads.find((thread) => thread.userId === userId && thread.barId === barId);
  }

  /**
   * Create a new chat thread
   */
  static createThread(
    barId: string,
    barName: string,
    userId: string,
    userName: string
  ): ChatThread {
    const now = new Date().toISOString();
    return {
      id: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      barId,
      barName,
      userId,
      userName,
      status: 'open',
      messages: [],
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
    };
  }

  /**
   * Create a new message
   */
  static createMessage(
    threadId: string,
    sender: MessageSender,
    senderName: string,
    message: string
  ): ChatMessage {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      sender,
      senderName,
      message,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
  }

  /**
   * Add a message to a thread
   */
  static addMessageToThread(
    thread: ChatThread,
    message: ChatMessage
  ): ChatThread {
    return {
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: message.timestamp,
    };
  }

  /**
   * Mark all messages in a thread as read
   */
  static markThreadAsRead(thread: ChatThread): ChatThread {
    return {
      ...thread,
      messages: thread.messages.map((msg) => ({ ...msg, status: 'read' })),
      unreadCount: 0,
    };
  }

  /**
   * Update thread status
   */
  static updateThreadStatus(
    thread: ChatThread,
    status: ChatThreadStatus
  ): ChatThread {
    return {
      ...thread,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate unread count for a thread (from perspective of sender type)
   */
  static calculateUnreadCount(
    thread: ChatThread,
    viewerType: MessageSender
  ): number {
    return thread.messages.filter(
      (msg) => msg.sender !== viewerType && msg.status === 'sent'
    ).length;
  }

  /**
   * Sort threads by most recent activity
   */
  static sortThreadsByActivity(threads: ChatThread[]): ChatThread[] {
    return threads.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
}

