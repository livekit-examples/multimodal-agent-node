import type { Zep, ZepClient } from '@getzep/zep-cloud';
import type { CallableFunction } from '@livekit/agents/dist/llm';
import { z } from 'zod';

export const updateUserName = (zep: ZepClient, user: Zep.User): CallableFunction => ({
  description: 'Called when the user provides or updates their name',
  parameters: z.object({
    firstName: z.string().describe("The user's first name"),
  }),
  execute: async ({ firstName }) => {
    console.log('Saving user info to the database');
    await zep.user.update(user.userId!, {
      firstName: firstName,
    });

    return `Thank you for providing your name.`;
  },
});
