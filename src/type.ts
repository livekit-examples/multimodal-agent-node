import type { Zep, ZepClient } from '@getzep/zep-cloud';
import type { CallableFunction } from '@livekit/agents/dist/llm';

export type Tool = (zep: ZepClient, user: Zep.User) => CallableFunction;
