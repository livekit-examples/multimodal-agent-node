import { z } from 'zod';
import type { Tool } from '../type.js';

export const randomJoke: Tool = () => ({
  description: 'Get a random joke',
  parameters: z.object({}),
  execute: async () => {
    console.debug('Getting a random joke!');
    const response = await fetch(`https://official-joke-api.appspot.com/random_joke`);
    if (!response.ok) {
      throw new Error(`Joke API returned status: ${response.status}`);
    }
    const joke = await response.json();
    return `Here is a random joke: ${joke.setup} ${joke.punchline}`;
  },
});
