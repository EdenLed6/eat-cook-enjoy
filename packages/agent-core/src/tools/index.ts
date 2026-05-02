import type { Anthropic } from '@anthropic-ai/sdk';
import { logMealTool, logMealFromPhotoTool } from './log-meal.js';
import { logWeightTool } from './log-weight.js';
import { logWaterTool } from './log-water.js';
import { logWorkoutTool } from './log-workout.js';
import { logStepsTool } from './log-steps.js';
import { logWoltOrderTool } from './log-wolt.js';
import { getTodaySummaryTool, getProgressTool } from './get-summary.js';
import { suggestMealTool, searchRecipesTool } from './suggest.js';
import { setReminderTool } from './set-reminder.js';
import { rememberTool } from './remember.js';
import { updateProfileTool, computeCalorieTargetTool } from './profile.js';
import type { ToolDefinition, ToolCtx } from './types.js';

export type { ToolDefinition, ToolCtx } from './types.js';

const ALL_TOOLS: ToolDefinition[] = [
  logMealTool,
  logMealFromPhotoTool,
  logWeightTool,
  logWaterTool,
  logWorkoutTool,
  logStepsTool,
  logWoltOrderTool,
  getTodaySummaryTool,
  getProgressTool,
  suggestMealTool,
  searchRecipesTool,
  setReminderTool,
  rememberTool,
  updateProfileTool,
  computeCalorieTargetTool,
];

export function getAllTools(): ToolDefinition[] {
  return ALL_TOOLS;
}

export function toAnthropicTools(): Anthropic.Tool[] {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool['input_schema'],
  }));
}

export async function executeTool(
  name: string,
  input: unknown,
  ctx: ToolCtx,
): Promise<unknown> {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { error: `כלי לא ידוע: ${name}` };
  }
  try {
    return await tool.execute(input, ctx);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
