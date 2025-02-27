import { SipClient } from 'livekit-server-sdk';

export const sip = new SipClient(
  process.env.LIVEKIT_URL ?? '',
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);
