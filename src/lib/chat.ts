import type { Message, ChatState, ToolCall, WeatherResult, MCPResult, ErrorResult, SessionInfo } from '../../worker/types';
import { apiGet, apiPost, apiDelete, apiPut, apiPatch } from '@/lib/apiClient';

export interface ChatResponse {
  success: boolean;
  data?: ChatState;
  error?: string;
}

export const MODELS = [
  { id: 'google-ai-studio/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google-ai-studio/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'google-ai-studio/gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

class ChatService {
  private sessionId: string;
  private baseUrl: string;

  constructor() {
    this.sessionId = crypto.randomUUID();
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }

  async sendMessage(
    message: string,
    model?: string,
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      if (onChunk) {
        // Streaming: use raw fetch to access response.body
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, model, stream: true }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              if (chunk) {
                fullResponse += chunk;
                onChunk(chunk);
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
        return { success: true };
      }

      // Non-streaming: use apiClient
      const data = await apiPost<ChatResponse>(`${this.baseUrl}/chat`, { message, model, stream: false });
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async getMessages(): Promise<ChatResponse> {
    try {
      return await apiGet<ChatResponse>(`${this.baseUrl}/messages`);
    } catch (error) {
      console.error('Failed to get messages:', error);
      return { success: false, error: 'Failed to load messages' };
    }
  }

  async clearMessages(): Promise<ChatResponse> {
    try {
      await apiDelete(`${this.baseUrl}/clear`);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear messages:', error);
      return { success: false, error: 'Failed to clear messages' };
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  newSession(): void {
    this.sessionId = crypto.randomUUID();
    this.baseUrl = `/api/chat/${this.sessionId}`;
  }

  switchSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.baseUrl = `/api/chat/${sessionId}`;
  }

  // Session Management Methods
  async createSession(title?: string, sessionId?: string, firstMessage?: string): Promise<{ success: boolean; data?: { sessionId: string; title: string }; error?: string }> {
    try {
      return await apiPost('/api/sessions', { title, sessionId, firstMessage });
    } catch {
      return { success: false, error: 'Failed to create session' };
    }
  }

  async listSessions(): Promise<{ success: boolean; data?: SessionInfo[]; error?: string }> {
    try {
      return await apiGet('/api/sessions');
    } catch {
      return { success: false, error: 'Failed to list sessions' };
    }
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await apiDelete(`/api/sessions/${sessionId}`);
    } catch {
      return { success: false, error: 'Failed to delete session' };
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await apiPut(`/api/sessions/${sessionId}/title`, { title });
    } catch {
      return { success: false, error: 'Failed to update session title' };
    }
  }

  async clearAllSessions(): Promise<{ success: boolean; data?: { deletedCount: number }; error?: string }> {
    try {
      return await apiDelete('/api/sessions');
    } catch {
      return { success: false, error: 'Failed to clear all sessions' };
    }
  }

  async updateModel(model: string): Promise<ChatResponse> {
    try {
      return await apiPost(`${this.baseUrl}/model`, { model });
    } catch {
      return { success: false, error: 'Failed to update model' };
    }
  }
}

export const chatService = new ChatService();

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const generateSessionTitle = (firstUserMessage?: string): string => {
  const now = new Date();
  const dateTime = now.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (!firstUserMessage || !firstUserMessage.trim()) {
    return `Chat ${dateTime}`;
  }

  // Clean and truncate the message
  const cleanMessage = firstUserMessage.trim().replace(/\s+/g, ' ');
  const truncated = cleanMessage.length > 40 
    ? cleanMessage.slice(0, 37) + '...' 
    : cleanMessage;

  return `${truncated} • ${dateTime}`;
};

export const renderToolCall = (toolCall: ToolCall): string => {
  const result = toolCall.result as WeatherResult | MCPResult | ErrorResult | undefined;
  
  if (!result) return `⚠️ ${toolCall.name}: No result`;
  if ('error' in result) return `❌ ${toolCall.name}: ${result.error}`;
  if ('content' in result) return `🔧 ${toolCall.name}: Executed`;
  if (toolCall.name === 'get_weather') {
    const weather = result as WeatherResult;
    return `🌤️ Weather in ${weather.location}: ${weather.temperature}°C, ${weather.condition}`;
  }

  return `🔧 ${toolCall.name}: Done`;
};