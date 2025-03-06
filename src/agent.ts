import type { llm } from '@livekit/agents';
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

    const { facts } = await zep.user.getFacts(user.userId);

    const model = new openai.realtime.RealtimeModel({
      instructions: `You are a helpful assistant and specialize in helping customers with company products and recipes.

      ${
        user.firstName
          ? `You're speaking with ${user.firstName}. Address them as such.`
          : `You don't know the user's name, you should ask for it. So you can call them by their name in future conversations.`
      }


      ${
        facts?.length
          ? `This is what we know about the user.
             Use this information to create context for the conversation.
             Do not give responses to user based on these facts unless user brings something up that could be related to these facts.
             Do not call tools or functions during startup unless user wants you to do so.
             `
          : ''
      }
      ${facts?.map((fact) => `${fact.content}`).join('\n')}
      `,

      voice: 'ballad',
    });

    const fncCtx: llm.FunctionContext = tools(user, ctx, participant).build({
      weather,
      dialRelavantDepartment,
      updateUserName,
      getDataFromZep,
    });

    const agent = new multimodal.MultimodalAgent({ model, fncCtx });

    agent.on('agent_speech_committed', (message: llm.ChatMessage) => {
      console.info('agent_speech_committed: %o', message.content);
    });
    agent.on('agent_speech_interupted', (message: llm.ChatMessage) => {
      console.info('agent_speech_interupted: %o', message.content);
    });
    agent.on('user_speech_committed', async (message: llm.ChatMessage) => {
      console.info('user_speech_committed: %o', message.content);

      if (!message.content) {
        return;
      }

      await zep.graph.add({
        userId: process.env.FORCE_ZEP_IDENTITY ?? participant.identity,
        type: 'message',
        data: message.content.toString(),
      });
    });

    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
