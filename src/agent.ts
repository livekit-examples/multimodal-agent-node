import { Zep, ZepClient } from '@getzep/zep-cloud';
import type { llm } from '@livekit/agents';
import { type JobContext, WorkerOptions, cli, defineAgent, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const API_KEY = process.env.ZEP_API_KEY;
const zep = new ZepClient({ apiKey: API_KEY });

// Functions

const getOrAddZepUser = async (userId: string) => {
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

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('Waiting for participant');
    const participant = await ctx.waitForParticipant();
    // The participant identity is the  user's phone number, or the name they give when joining the room.
    // starting assistant example agent for "sip_+447949414141"
    // starting assistant example agent for "interactive-tesseract"

    console.log(`Starting assistant example agent for "${participant.identity}"`);

    const user = await getOrAddZepUser(participant.identity);

    if (!user.userId) {
      throw new Error('User ID is required');
    }

    const { facts } = await zep.user.getFacts(user.userId);

    console.log(facts);

    const model = new openai.realtime.RealtimeModel({
      instructions: `You are a helpful assistant.

      ${
        user.firstName
          ? `You're speaking with ${user.firstName}. Address them as such.`
          : `You don't know the user's name, you should ask for it. So you can call them by their name in future conversations.`
      }

      ${facts?.length ? `This is what we know about the user:` : ''}
      ${facts?.map((fact) => `${fact.content}`).join('\n')}
      `,
      voice: 'ballad',
    });

    const fncCtx: llm.FunctionContext = {
      weather: {
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          console.debug(`executing weather function for ${location}`);
          const response = await fetch(`https://wttr.in/${location}?format=%C+%t`);
          if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
          }
          const weather = await response.text();
          return `The weather in ${location} right now is ${weather}.`;
        },
      },
      updateUserName: {
        description: 'Called when the user provides or updates their name',
        parameters: z.object({
          firstName: z.string().describe("The user's first name"),
        }),
        execute: async ({ firstName }) => {
          console.log('Saving user info to the database');
          console.log(firstName);

          await zep.user.update(user.userId!, {
            firstName: firstName,
          });

          return `Thank you for providing your name.`;
        },
      },
    };
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
        userId: participant.identity,
        type: 'message',
        data: message.content.toString(),
      });
    });

    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    // session.conversation.item.create(
    //   llm.ChatMessage.create({
    //     role: llm.ChatRole.SYSTEM,
    //     text: `Hey, what's your favourite pizza?`,
    //   }),
    // );

    session.response.create();
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
