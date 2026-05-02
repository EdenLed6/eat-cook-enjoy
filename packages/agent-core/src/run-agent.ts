import type { Anthropic } from '@anthropic-ai/sdk';
import { getDb, eq, desc } from '@eat/db';
import { profiles, messages, users } from '@eat/db';
import { he } from '@eat/shared';
import { getAnthropic, defaultModel } from './claude.js';
import { buildSystemPrompt } from './prompts/system.js';
import {
  getTodaySummary,
  getRecentMemory,
  getWeeklyWeight,
  getRecentMessagesForContext,
  localTimeStr,
} from './memory.js';
import { toAnthropicTools, executeTool } from './tools/index.js';

const MAX_TOOL_TURNS = 6;

export interface RunAgentInput {
  userId: string;
  timezone: string;
  incoming:
    | { kind: 'text'; text: string }
    | { kind: 'image'; storageKey: string; caption?: string };
}

export interface RunAgentOutput {
  text: string;
  toolCalls: number;
  truncated: boolean;
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentOutput> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, input.userId));
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, input.userId));
  if (!user || !profile) {
    return {
      text: 'משהו לא הוגדר עדיין. נא להריץ אונבורדינג קודם.',
      toolCalls: 0,
      truncated: false,
    };
  }

  const today = await getTodaySummary(input.userId, input.timezone);
  const memory = await getRecentMemory(input.userId, 10);
  const weeklyWeight = await getWeeklyWeight(input.userId);
  const recentMessages = await getRecentMessagesForContext(input.userId, 20);

  const dietMethodLabel =
    he.dietMethodNames[profile.dietMethod ?? 'mediterranean'] ?? 'תזונה ים-תיכונית';

  const systemPrompt = buildSystemPrompt({
    displayName: user.displayName ?? 'יקירה',
    dietMethodLabel,
    today,
    recentMemory: memory,
    weeklyWeight,
    localTimeStr: localTimeStr(input.timezone),
    fastingWindow: profile.fastingWindow as { start: string; end: string } | null,
  });

  const conversationMsgs: Anthropic.MessageParam[] = recentMessages
    .map<Anthropic.MessageParam | null>((m) => {
      if (!m.text) return null;
      return {
        role: m.direction === 'in' ? 'user' : 'assistant',
        content: m.text,
      };
    })
    .filter((m): m is Anthropic.MessageParam => m !== null);

  const userContent = buildUserContent(input.incoming);
  conversationMsgs.push({ role: 'user', content: userContent });

  const ctx = {
    userId: input.userId,
    timezone: input.timezone,
    pendingPhotoStorageKey: input.incoming.kind === 'image' ? input.incoming.storageKey : null,
  };

  const client = getAnthropic();
  const tools = toAnthropicTools();
  let toolCalls = 0;
  let response: Anthropic.Message;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    response = await client.messages.create({
      model: defaultModel(),
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: conversationMsgs,
    });

    if (response.stop_reason !== 'tool_use') break;

    const assistantBlocks = response.content;
    conversationMsgs.push({ role: 'assistant', content: assistantBlocks });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of assistantBlocks) {
      if (block.type !== 'tool_use') continue;
      toolCalls++;
      const result = await executeTool(block.name, block.input, ctx);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    conversationMsgs.push({ role: 'user', content: toolResults });
  }

  const finalText =
    response!.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim() || he.errors.not_understood;

  return {
    text: finalText,
    toolCalls,
    truncated: response!.stop_reason === 'tool_use',
  };
}

function buildUserContent(
  incoming: RunAgentInput['incoming'],
): Anthropic.MessageParam['content'] {
  if (incoming.kind === 'text') return incoming.text;
  return [
    {
      type: 'text',
      text: incoming.caption?.trim()
        ? `[המשתמשת שלחה תמונה עם הקפשן: "${incoming.caption.trim()}". יש לקרוא ל-log_meal_from_photo כדי לנתח אותה.]`
        : '[המשתמשת שלחה תמונה. יש לקרוא ל-log_meal_from_photo כדי לנתח אותה.]',
    },
  ];
}
