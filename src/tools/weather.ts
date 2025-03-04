import { z } from 'zod';
import type { Tool } from '../type.js';

// export const getUsersLocation = async (userId: string) => {
//   console.debug(`executing getUsersLocation function for ${location}`);

//   const { edges } = await zep.graph.search({
//     query: "User's location",
//     userId: userId,
//   });

//   return edges?.join('\n');
// };

export const weather: Tool = () => ({
  description: `This function should get the weather in a location. 
                The function first tries to check the database for users location. 
                If the location is not found, it will ask the user for the location.`,
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
