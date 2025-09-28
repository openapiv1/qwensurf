export type ComputerModel = "qwen" | "anthropic" | "openai" | "gemini";

export enum SSEEventType {
  SANDBOX_CREATED = "sandbox_created",
  MESSAGE = "message",
  ACTION = "action",
  ACTION_RESULT = "action_result",
  ERROR = "error",
  DONE = "done",
}

export interface SSEEvent<T extends ComputerModel = ComputerModel> {
  type: SSEEventType;
  data?: any;
  sandboxId?: string;
  vncUrl?: string;
  message?: string;
  action?: any;
  result?: any;
  error?: string;
}

export interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}