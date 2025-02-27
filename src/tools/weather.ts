import { z } from 'zod';
import type { Tool } from '../type';

export const weather: Tool = () => ({
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
});
