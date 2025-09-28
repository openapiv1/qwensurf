import { ComputerModel } from "./api";

export interface BaseChatMessage {
  id: string;
  role: string;
  content: string;
}

export interface UserChatMessage extends BaseChatMessage {
  role: "user";
}

export interface AssistantChatMessage extends BaseChatMessage {
  role: "assistant";
  model?: ComputerModel;
}

export interface SystemChatMessage extends BaseChatMessage {
  role: "system";
  isError?: boolean;
}

export interface ActionChatMessage<TModel extends string = string> extends BaseChatMessage {
  role: "action";
  action: any;
  status: "pending" | "completed" | "error";
  model: TModel;
}

export type ChatMessage = 
  | UserChatMessage 
  | AssistantChatMessage 
  | SystemChatMessage 
  | ActionChatMessage;

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface SendMessageOptions {
  content: string;
  sandboxId?: string;
  environment?: string;
  resolution?: [number, number];
}

export interface ParsedSSEEvent<TModel extends string = string> {
  type: string;
  content?: string;
  action?: any;
  sandboxId?: string;
  vncUrl?: string;
}