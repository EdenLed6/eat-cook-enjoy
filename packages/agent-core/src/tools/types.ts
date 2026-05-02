export interface ToolCtx {
  userId: string;
  timezone: string;
  pendingPhotoStorageKey?: string | null;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (input: TInput, ctx: ToolCtx) => Promise<TOutput>;
}
