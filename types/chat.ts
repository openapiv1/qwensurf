export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  timestamp?: number;
}

export interface UserChatMessage extends ChatMessage {
  role: "user";
}

export interface AssistantChatMessage extends ChatMessage {
  role: "assistant";
}

export interface SystemChatMessage extends ChatMessage {
  role: "system";
}

export interface ActionChatMessage extends ChatMessage {
  role: "assistant";
  action?: any;
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  sandboxId?: string;
  vncUrl?: string;
}

export interface SendMessageOptions {
  message: string;
  model?: string;
  sandboxId?: string;
  resolution?: [number, number];
}

export interface ParsedSSEEvent {
  type: string;
  data?: any;
}