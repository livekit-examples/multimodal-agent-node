import { z } from 'zod';
import { queryZepGraph } from '../lib/index.js';
import type { Tool } from '../type.js';

const TOPICS_GROUP_ID_MAP = {
  // Topics that relate to food services and relavant graphs
  deliver: 'food-ordering-help-group',
  takeaway: 'food-ordering-help-group',
  ordering: 'food-ordering-help-group',

  // Topics that relate to volkswagen cars and relavant graphs
  volkswagen: 'volkswagen-cars',

  // Topics that relate to smart shopping and saving money
  'smart-shopping': 'smart-shopping-group',
  'saving-money': 'smart-shopping-group',
};

export const getDataFromZep: Tool = () => ({
  description: `Called when users wants help with any of the following things

        1. delivery
        2. takeaway
        3. ordering

        4. smart-shopping
        5. saving-money

        7. volkswagen cars

        Each of these topics is associated with a group id as follows

        ${JSON.stringify(TOPICS_GROUP_ID_MAP)}

        Use this function to retrieve data from the database before responding to the user
        `,
  parameters: z.object({
    query: z.string().describe('The topic user wants help with'),
    groupId: z.string().describe('Associated group id'),
  }),
  execute: async ({ query, groupId }) => {
    console.log(`Querying zep with query: ${query} and groupId: ${groupId}`);

    try {
      return await queryZepGraph(query, groupId);
    } catch (error) {
      console.log('Error querying zep graph', error);
      return `Unable to retrieve data at this time`;
    }
  },
});
