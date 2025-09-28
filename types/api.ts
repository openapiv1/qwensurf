export type ComputerModel = "grok" | "openai";

export enum SSEEventType {
  UPDATE = "update",
  DONE = "done",
  ERROR = "error",
  REASONING = "reasoning",
  ACTION = "action",
  ACTION_COMPLETED = "action_completed",
  SANDBOX_CREATED = "sandbox_created",
}

export interface SSEEventBase {
  type: SSEEventType;
  content?: string;
}

export interface SSEEventUpdate extends SSEEventBase {
  type: SSEEventType.UPDATE;
  content: string;
}

export interface SSEEventDone extends SSEEventBase {
  type: SSEEventType.DONE;
  content?: string;
}

export interface SSEEventError extends SSEEventBase {
  type: SSEEventType.ERROR;
  content: string;
}

export interface SSEEventReasoning extends SSEEventBase {
  type: SSEEventType.REASONING;
  content: string;
}

export interface SSEEventAction extends SSEEventBase {
  type: SSEEventType.ACTION;
  action: any;
}

export interface SSEEventActionCompleted extends SSEEventBase {
  type: SSEEventType.ACTION_COMPLETED;
}

export interface SSEEventSandboxCreated extends SSEEventBase {
  type: SSEEventType.SANDBOX_CREATED;
  sandboxId: string;
  vncUrl: string;
}

export type SSEEvent<TModel extends string = string> = 
  | SSEEventUpdate
  | SSEEventDone
  | SSEEventError
  | SSEEventReasoning
  | SSEEventAction
  | SSEEventActionCompleted
  | SSEEventSandboxCreated;

export interface ActionResponse {
  action: string;
  data: {
    type: string;
    [key: string]: any;
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}