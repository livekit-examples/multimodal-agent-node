import { zepFields } from '@getzep/zep-cloud';
import { z } from 'zod';
import { zep } from '../clients/zep.js';
import type { Tool } from '../type.js';

export const getUsersLocation = async (sessionId: string) => {
  console.debug(`Getting users location from session: ${sessionId}`);

  const result = await zep.memory.extract(
    sessionId,
    {
      location: zepFields.text('The location user last checked weather for'),
    },
    {
      lastN: 100, // The number of messages in the chat history from which to extract data,
      currentDateTime: new Date().toISOString(),
    },
  );

  return result?.location;
};

export const weather: Tool = (_user, _ctx, _participant, zepSession) => ({
  description: `This function should get the weather in a location. It also has the ability to retrieve user's location from the chat history if not explicitly provided.`,
  parameters: z.object({
    location: z.string().optional().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => {
    console.log('Weather function called for: ', location);
    let usersLocation = location;

    if (!zepSession.sessionId) return 'Zep session not found for the user.';

    // If locatin was not provided check for location references in chat hisotry
    if (!usersLocation) {
      try {
        usersLocation = await getUsersLocation(zepSession.sessionId);
      } catch (error) {
        console.error('Error getting users location:', error);
        return 'Could not find your location. Please provide a location to get the weather for.';
      }
    }

    if (!usersLocation)
      return 'Could not find your location. Please provide a location to get the weather for.';

    console.debug(`executing weather function for ${location}`);

    try {
      const response = await fetch(`https://wttr.in/${location}?format=%C+%t`);
      if (!response.ok) {
        throw new Error(`Weather API returned status: ${response.status}`);
      }
      const weather = await response.text();
      return `The weather in ${location} right now is ${weather}.`;
    } catch (error) {
      console.error('Weather API request failed:', error);
      return 'Failed to get the weather. Please try again.';
    }
  },
});
