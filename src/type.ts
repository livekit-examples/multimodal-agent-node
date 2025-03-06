import type { Zep } from '@getzep/zep-cloud';
import type { JobContext } from '@livekit/agents';
import type { CallableFunction } from '@livekit/agents/dist/llm';
import type { RemoteParticipant } from '@livekit/rtc-node';

export type Tool = (
  user: Zep.User,
  ctx: JobContext,
  participant: RemoteParticipant,
  zepSession: Zep.Session,
) => CallableFunction;
