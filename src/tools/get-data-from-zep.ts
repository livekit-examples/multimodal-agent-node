import { z } from 'zod';
import { queryZepGraph } from '../lib/index.js';
import type { Tool } from '../type.js';

const TOPICS_GROUP_ID_MAP = {
  products: 'product-catalog',
  recipes: 'recipes',
};

export const getDataFromZep: Tool = () => ({
  description: `Called when users wants help with any of the following things

        1. company products
        2. recipes

        Each of these topics is associated with a group id as follows

        ${JSON.stringify(TOPICS_GROUP_ID_MAP)}

        Use this function to retrieve data from the database before responding to the user
        `,
  parameters: z.object({
    query: z.string().describe('The topic user wants help with'),
    groupId: z.string().describe('Associated group id'),
  }),
  execute: async ({ groupId }) => {
    console.log(`Querying zep  groupId: ${groupId}`);

    try {
      return await queryZepGraph(groupId);
    } catch (error) {
      console.log('Error querying zep graph', error);
      return `Unable to retrieve data at this time`;
    }
  },
});
