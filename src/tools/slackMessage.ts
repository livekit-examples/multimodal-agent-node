import { z } from 'zod';
import type { Tool } from '../type.js';

export const slackMessage: Tool = () => ({
  description: 'Send a message to the #voice-agent-demo Slack channel',
  parameters: z.object({
    message: z.string().describe('The message to send to the Slack channel'),
  }),
  execute: async ({ message }) => {
    console.debug(`executing slack message function to send: ${message}`);

    const webhookUrl =
      process.env.SLACK_WEBHOOK_URL ||
      'https://hooks.slack.com/services/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';

    const payload = {
      text: message,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API returned status: ${response.status}`);
      }

      return `Successfully sent message to #voice-agent-demo: "${message}"`;
    } catch (error: unknown) {
      console.error('Error sending message to Slack:', error);
      // Handle the unknown type properly
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send message to Slack: ${errorMessage}`);
    }
  },
});
