import { Zep } from '@getzep/zep-cloud';
import { llm } from '@livekit/agents';
import { zep } from '../clients/zep.js';
import type { Tool } from '../type.js';

export const queryZepGraph = async (groupId: string): Promise<string | null> => {
  try {
    const episodes = await zep.graph.episode.getByGroupId(groupId);
    return JSON.stringify(episodes, null, 2);
  } catch (error) {
    console.error('Keyword handling failed:', error);
    return `Failed to query database`;
  }
};

export const getOrAddZepUser = async (userId: string) => {
  try {
    return await zep.user.get(userId);
  } catch (error) {
    if (error instanceof Zep.NotFoundError) {
      return await zep.user.add({
        userId: userId,
      });
    }
    throw error;
  }
};

export const tools = (...x: Parameters<Tool>) => {
  return {
    build: (params: Record<string, Tool>) => {
      const returnValue = Object.entries(params).map(([toolKey, tool]) => {
        return { [toolKey]: tool(...x) };
      });
      return Object.assign({}, ...returnValue);
    },
  };
};

type SessionId = `${string}-${string}`;

// Why do we need this?
// We want to be able to retrieve past conversation witht the user given userId and roomId
// So we concatenate userId and roomId to construct a unique sesion id specific to a room and user
const constructUserSessionId = (userId: string, roomId: string): SessionId => {
  return `${userId}-${roomId}`;
};

export const appendMessageToSession = async (
  sessionId: SessionId,
  message: string,
  role: Zep.RoleType,
) => {
  await zep.memory.add(sessionId, {
    messages: [
      {
        content: message,
        roleType: role,
      },
    ],
  });
};

export const getOrCreateZepSession = async (userId: string, roomId: string) => {
  const sessionId = constructUserSessionId(userId, roomId);

  console.log('Get or add session', sessionId);
  try {
    const session = (await zep.memory.getSession(sessionId)) as Promise<
      Zep.Session & { sessionId: SessionId }
    >;
    return session;
  } catch (error) {
    if (error instanceof Zep.NotFoundError) {
      const newSession = (await zep.memory.addSession({
        sessionId: sessionId,
        userId: userId,
      })) as Promise<Zep.Session & { sessionId: SessionId }>;
      return newSession;
    } else throw error;
  }
};

export const zepRoleToChatRole = (role: Zep.RoleType): llm.ChatRole => {
  switch (role) {
    case Zep.RoleType.AssistantRole:
      return llm.ChatRole.ASSISTANT;

    case Zep.RoleType.UserRole:
      return llm.ChatRole.USER;

    case Zep.RoleType.SystemRole:
      return llm.ChatRole.SYSTEM;

    case Zep.RoleType.FunctionRole:
      return llm.ChatRole.TOOL;

    case Zep.RoleType.ToolRole:
      return llm.ChatRole.TOOL;

    default:
      return llm.ChatRole.SYSTEM;
  }
};
