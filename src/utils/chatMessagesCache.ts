import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/src/supabase/chat';

const PREFIX = 'kla_chat_messages_v1:';
const MAX_CACHED = 50;

function key(roomId: string): string {
  return `${PREFIX}${roomId}`;
}

export async function getCachedChatMessages(roomId: string): Promise<ChatMessage[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ChatMessage[];
  } catch {
    return null;
  }
}

export async function setCachedChatMessages(roomId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const tail = messages.length > MAX_CACHED ? messages.slice(-MAX_CACHED) : messages;
    await AsyncStorage.setItem(key(roomId), JSON.stringify(tail));
  } catch {
    // ignore
  }
}
