/**
 * Chat models
 * Represents chat/messaging functionality for table reservations
 */

/**
 * Message sender type
 */
export type MessageSender = 'user' | 'bar';

/**
 * Chat message status
 */
export type MessageStatus = 'sent' | 'read';

/**
 * Chat participant
 */
export interface ChatParticipant {
  id: string;
  name: string;
  type: 'user' | 'bar';
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  threadId: string;
  sender: MessageSender;
  senderName: string;
  message: string;
  timestamp: string; // ISO datetime string
  status: MessageStatus;
}

/**
 * Chat thread status
 */
export type ChatThreadStatus = 'open' | 'closed';

/**
 * Chat thread
 * Represents a conversation between a user and a bar
 */
export interface ChatThread {
  id: string;
  barId: string;
  barName: string;
  userId: string;
  userName: string;
  status: ChatThreadStatus;
  messages: ChatMessage[];
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  unreadCount?: number; // Number of unread messages (for the current viewer)
}

/**
 * Storage keys for localStorage
 */
export const CHAT_STORAGE_KEYS = {
  THREADS: 'barmatch_chat_threads',
} as const;

