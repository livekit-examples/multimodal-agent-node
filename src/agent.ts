import { Zep } from '@getzep/zep-cloud';
import { llm } from '@livekit/agents';
import { type JobContext, WorkerOptions, cli, defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zep } from './clients/zep.js';
import { getOrAddZepUser, tools } from './lib/index.js';
import { dialRelavantDepartment } from './tools/dial-in-department.js';
import { getDataFromZep } from './tools/get-data-from-zep.js';
import { updateUserName } from './tools/update-user-name.js';
import { weather } from './tools/weather.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

type SessionId = `${string}-${string}`;

// Why do we need this?
// We want to be able to retrieve past conversation witht the user given userId and roomId
// So we concatenate userId and roomId to construct a unique sesion id specific to a room and user
const constructUserSessionId = (userId: string, roomId: string): SessionId => {
  return `${userId}-${roomId}`;
};

const appendMessageToSession = async (
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

const getOrCreateZepSession = async (userId: string, roomId: string) => {
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

const zepRoleToChatRole = (role: Zep.RoleType): llm.ChatRole => {
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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('Waiting for participant');
    const participant = await ctx.waitForParticipant();
    // The participant identity is the  user's phone number, or the name they give when joining the room.
    // starting assistant example agent for "sip_+447949414141"
    // starting assistant example agent for "interactive-tesseract"

    console.log(`Starting assistant example agent for "${participant.identity}"`);

    const user = await getOrAddZepUser(process.env.FORCE_ZEP_IDENTITY ?? participant.identity);

    if (!user.userId) {
      throw new Error('User ID is required');
    }

    const zepSession = await getOrCreateZepSession(user.userId, 'test-room');

    if (!zepSession?.sessionId) {
      throw new Error('Zep session is required');
    }

    console.log('sessionId', zepSession.sessionId);
    const sessionMessages = await zep.memory.getSessionMessages(zepSession.sessionId);
    console.log(sessionMessages);
    const model = new openai.realtime.RealtimeModel({
      instructions: `You are a helpful assistant and specialize in helping customers with delivery, takeaway and instore purchaing services.

      ${
        user.firstName
          ? `You're speaking with ${user.firstName}. Address them as such.`
          : `You don't know the user's name, you should ask for it. So you can call them by their name in future conversations.`
      }
      `,

      voice: 'ballad',
    });

    const fncCtx: llm.FunctionContext = tools(user, ctx, participant).build({
      weather,
      dialRelavantDepartment,
      updateUserName,
      getDataFromZep,
    });

    const chatCtx: llm.ChatContext = new llm.ChatContext();

    sessionMessages.messages?.forEach((message) => {
      chatCtx.append({
        role: zepRoleToChatRole(message.roleType),
        text: message.content.toString(),
      });
    });

    console.log('chatCtx', chatCtx);

    const agent = new multimodal.MultimodalAgent({ model, fncCtx, chatCtx });

    agent.on('agent_speech_committed', async (message: llm.ChatMessage) => {
      console.info('agent_speech_committed: %o', message.content);

      await appendMessageToSession(
        zepSession.sessionId,
        message.content?.toString() ?? '',
        Zep.RoleType.AssistantRole,
      );
    });
    agent.on('agent_speech_interupted', async (message: llm.ChatMessage) => {
      console.info('agent_speech_interupted: %o', message.content);

      await appendMessageToSession(
        zepSession.sessionId,
        message.content?.toString() ?? '',
        Zep.RoleType.AssistantRole,
      );
    });
    agent.on('user_speech_committed', async (message: llm.ChatMessage) => {
      console.info('user_speech_committed: %o', message.content);

      await appendMessageToSession(
        zepSession.sessionId,
        message.content?.toString() ?? '',
        Zep.RoleType.UserRole,
      );
    });

    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    console.log('Session messages', session.chatCtx);

    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
