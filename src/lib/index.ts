import { Zep } from '@getzep/zep-cloud';
import { zep } from '../clients/zep.js';
import type { Tool } from '../type.js';

export const queryZepGraph = async (text: string, groupId: string): Promise<string | null> => {
  try {
    const { edges } = await zep.graph.search({
      query: text,
      groupId: groupId,
      scope: 'edges',
    });
    const data = edges?.map((edge) => `${edge.fact.toString()}`).join('\n');
    console.log({ data });

    return data ?? '';
  } catch (error) {
    console.error('Keyword handling failed:', error);
    return `Failed to query database`;
  }
};

export const getOrAddZepUser = async (userId: string) => {
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

export const tools = (...x: Parameters<Tool>) => {
  return {
    build: (params: Record<string, Tool>) => {
      const returnValue = Object.entries(params).map(([toolKey, tool]) => {
        return { [toolKey]: tool(...x) };
      });
      return Object.assign({}, ...returnValue);
    },
  };
};
