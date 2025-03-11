import { Zep } from '@getzep/zep-cloud';
import { llm } from '@livekit/agents';
import { type JobContext, WorkerOptions, cli, defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zep } from './clients/zep.js';
import {
  appendMessageToSession,
  getOrAddZepUser,
  getOrCreateZepSession,
  tools,
  zepRoleToChatRole,
} from './lib/index.js';
import { dialRelavantDepartment } from './tools/dial-in-department.js';
import { getDataFromZep } from './tools/get-data-from-zep.js';
import { randomJoke } from './tools/joke.js';
import { updateUserName } from './tools/update-user-name.js';
import { weather } from './tools/weather.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

type Config = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  instruction: string;
  voice: string | null;
  organisationId: string | null;
};

const loadConfig = (): Promise<Config | null> => {
  const url = process.env.CONFIG_SOURCE_URL;
  const urlWS = process.env.LIVEKIT_URL;

  return new Promise(async (resolve, reject) => {
    if (!url) {
      reject(new Error('CONFIG_SOURCE_URL is required'));
      return process.exit(1);
    }

    if (!urlWS) {
      reject(new Error('LIVEKIT_URL is required'));
      return process.exit(1);
    }

    const res = await fetch(`${url}?urlWS=${urlWS}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urlWS }),
    });

    if (res.status !== 200) {
      reject(new Error('Failed to fetch config'));
      return process.exit(1);
    }

    const data = (await res.json()) as Config;
    return resolve(data);
  });
};

const config = await loadConfig();

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('Waiting for participant');
    const participant = await ctx.waitForParticipant();
    // The participant identity is the  user's phone number, or the name they give when joining the room.
    // starting assistant example agent for "sip_+447949414141"
    // starting assistant example agent for "interactive-tesseract"

    console.log(
      `Starting assistant example agent for "${process.env.FORCE_ZEP_IDENTITY ?? participant.identity}"`,
    );

    const user = await getOrAddZepUser(process.env.FORCE_ZEP_IDENTITY ?? participant.identity);

    if (!user.userId) {
      throw new Error('User ID is required');
    }

    const zepSession = await getOrCreateZepSession(user.userId, randomUUID());

    if (!zepSession?.sessionId) {
      throw new Error('Zep session is required');
    }

    const memory = await zep.memory.get(zepSession.sessionId);

    const sessionMessages = await zep.memory.getSessionMessages(zepSession.sessionId, {
      limit: 100,
    });

    const model = new openai.realtime.RealtimeModel({
      instructions: `
      ${config?.instruction ?? 'You are a helpful assistant'}

      ${
        user.firstName
          ? `You're speaking with ${user.firstName}. Address them as such.`
          : `You don't know the user's name, you should ask for it. So you can call them by their name in future conversations.`
      }

      ${memory.context}
      `,

      voice: config?.voice ?? 'ballad',
    });

    const fncCtx: llm.FunctionContext = tools(user, ctx, participant, zepSession).build({
      weather,
      dialRelavantDepartment,
      updateUserName,
      getDataFromZep,
      randomJoke,
    });

    const chatCtx: llm.ChatContext = new llm.ChatContext();

    sessionMessages.messages?.forEach((message) => {
      chatCtx.append({
        role: zepRoleToChatRole(message.roleType),
        text: message.content,
      });
    });

    const agent = new multimodal.MultimodalAgent({
      model,
      fncCtx,
      chatCtx,
      maxTextResponseRetries: 1,
    });

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

    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
