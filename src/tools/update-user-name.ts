import { z } from 'zod';
import { zep } from '../clients/zep.js';
import type { Tool } from '../type.js';

export const updateUserName: Tool = (user) => ({
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
