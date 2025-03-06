import { Zep } from '@getzep/zep-cloud';
import { zep } from '../clients/zep.js';
import type { Tool } from '../type.js';

export const queryZepGraph = async (text: string, groupId: string): Promise<string | null> => {
  try {
    const episodes = await zep.graph.episode.getByGroupId(groupId);

    return JSON.stringify(episodes, null, 2);
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
