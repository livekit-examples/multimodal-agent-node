// @ts-nocheck
import { Zep, ZepClient } from '@getzep/zep-cloud';
import { type JobContext, WorkerOptions, cli, defineAgent, llm, multimodal } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import type { Participant } from '@livekit/rtc-node';
import { ParticipantKind } from '@livekit/rtc-node';
// ignore this file for now
import Prisma from '@prisma/client';
import dotenv from 'dotenv';
import { SipClient } from 'livekit-server-sdk';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// dotenv.config({
//   path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'),
// });

// const prisma = new Prisma.PrismaClient();

const sipClient = new SipClient(
  process.env.LIVEKIT_URL ?? '',
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

const zepClient = new ZepClient({
  apiKey: process.env.ZEP_API_KEY,
});

const getVoiceAgentUser = async (
  organisationId: number,
  contact: string,
  type: Prisma.ContactType = Prisma.ContactType.OTHER,
): Promise<Prisma.User | undefined> => {
  const existingUser = await prisma.user.findFirst({
    include: {
      contacts: true,
    },
    where: {
      contacts: {
        some: {
          type: type,
          contact: contact,
          active: true,
        },
      },
    },
  });

  if (existingUser) return existingUser;

  const newUser = await prisma.user.create({
    include: {
      contacts: true,
    },
    data: {
      organisationId: organisationId,
      contacts: {
        create: [
          {
            type: type,
            contact: contact,
          },
        ],
      },
    },
  });

  return newUser ?? undefined;
};

const getParticipantUser = async (
  participant: Participant,
  organisation: Prisma.Organisation,
): Promise<Prisma.User | undefined> => {
  //if ((participant.kind == ParticipantKind.SIP) && participant.attributes && participant.attributes['sip.phoneNumber']) {
  //  return  await getVoiceAgentUser(organisation.id, participant.attributes['sip.phoneNumber'], Prisma.ContactType.PHONE);

  // hack!  but for now, since there's no such attribute participant.attributes['sip.phoneNumber']
  if (
    participant.kind == ParticipantKind.SIP &&
    participant.identity &&
    /^sip_(\+?\d+)$/.test(participant.identity)
  )
    return await getVoiceAgentUser(
      organisation.id,
      participant.identity.substring(4),
      Prisma.ContactType.PHONE,
    );

  if (participant.identity)
    return await getVoiceAgentUser(organisation.id, participant.identity, Prisma.ContactType.OTHER);

  return undefined;
};

const getUserInfoText = async (user: Prisma.User | undefined): Promise<string | undefined> => {
  /*
  if (user) {
    const   userMetadata            = await prisma.userMetadata.findMany({
    //select  : {
    //            name    : true,
    //            value   : true,
    //          },
      where   : {
                  userId  : user.id,
                  active  : true,
                },
    });

    return  userMeta.map((userMeta) => `${userMeta.name}: ${userMeta.value}`).join('\n\n');
  }
*/

  return undefined;
};

const createUserSession = async (
  user: Prisma.User | undefined,
  agent: Prisma.Agent,
): Promise<Prisma.Session | undefined> => {
  if (user)
    return await prisma.session.create({
      data: {
        userId: user.id,
        agentId: agent.id,
      },
    });
};

const getZepUser = async (user: Prisma.User) => {
  try {
    return await zepClient.user.get(`${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${user.uuid}`);
  } catch (error) {
    if (error instanceof Zep.NotFoundError)
      return await zepClient.user.add({
        userId: `${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${user.uuid}`,
        //metadata: {
        //          },
      });
  }
};

const getUserMemoryText = async (
  user: Prisma.User | undefined,
  session: Prisma.Session | undefined,
): Promise<string | undefined> => {
  if (user && session)
    try {
      const zepUser = await getZepUser(user);
      const zepSession = await zepClient.memory.addSession({
        sessionId: `${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${session.uuid}`,
        userId: `${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${user.uuid}`,
        //metadata        : {
        //                  },
      });
      const zepSessionMemory = user.sessionUuid
        ? await zepClient.memory.get(
            `${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${user.sessionUuid}`,
          )
        : undefined;

      return zepSessionMemory?.context;
      //return  zepSessionMemory?.relevantFacts?.reverse().map(f => `[${f.createdAt}] ${f.content}\n`).join('');
    } catch (error) {
      // arghh....
    }

  return undefined;
};

const addSessionMessage = async (
  session: Prisma.Session | undefined,
  useMemory: boolean,
  role: Prisma.MessageRole,
  content: string,
) => {
  //console.log('addSessionMessage(); sessionUuid=%o; useMemory=%o; role=%o; content=%o', session?.uuid, role, content);
  if (session) {
    const message = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: role,
        content: content,
      },
    });

    if (useMemory)
      await zepClient.memory.add(`${process.env.VOICEAGENT_ZEP_PREFIX ?? ''}${session.uuid}`, {
        messages: [
          {
            content: content,
            roleType: role,
          },
        ],
      });

    await prisma.user.updateMany({
      data: {
        sessionUuid: session.uuid,
      },
      where: {
        id: session.userId,
        sessionUuid: null,
      },
    });
  }
};

const startVoiceAgent = async (context: JobContext) => {
  await context.connect();
  console.log('voice agent %o waiting for participant %o', context.job.agentName, context.job.id);

  const participant = await context.waitForParticipant();
  console.log(
    'starting voice agent for %o (kind %o) in room %o',
    participant.identity,
    participant.kind,
    context.room.name,
    participant.attributes,
  );

  const agent = await prisma.agent.findFirstOrThrow({
    include: {
      sipCalls: true,
      sipTransfers: true,
    },
    where: {
      uuid: process.env.VOICEAGENT_AGENT_UUID ?? '',
      //active          : true,
    },
  });
  //console.log('agent ', agent);
  const organisation = await prisma.organisation.findFirstOrThrow({
    where: {
      id: agent.organisationId,
      active: true,
    },
  });
  const user = await getParticipantUser(participant, organisation);
  const userInfoText = user ? await getUserInfoText(user) : undefined;
  const session = user ? await createUserSession(user, agent) : undefined;
  const userMemoryText = agent.useMemory ? await getUserMemoryText(user, session) : undefined;
  //console.log('user %o %o; session %o %o; info=%o; memory=%o', user?.id, user?.uuid, session?.id, session?.uuid, userInfoText, userMemoryText);

  const realtimeModel = new openai.realtime.RealtimeModel({
    //instructions                    : agent.instructions.trim(),
    //instructions                    : `${agent.instructions.trim() || 'You are a helpful assistant.'}\n\n${userMemoryText ?? ''}`.trim(),
    instructions:
      `${agent.instructions.trim() || 'You are a helpful assistant.'}\n\n${userMemoryText ?? ''}\n\n${userInfoText ? `<INFO>\n${userInfoText}</INFO>\n` : ''}`.trim(),
    //modalities                      : [ 'audio', ],
    modalities: ['text', 'audio'],
    voice: agent.voice || 'alloy', // default is 'alloy'.
    //inputAudioFormat                : 'pcm16',
    //outputAudioFormat               : 'pcm16',
    //model                           : agent.model || ''       // default is 'gpt-4o-realtime-preview-2024-10-01'.
    //temperature                     : undefined,              // default is 0.5.
  });

  const chatContext: llm.ChatContext = new llm.ChatContext();
  const functionContext: llm.FunctionContext = {};

  /*
  if (userInfoText)
    chatContext.append({
    //text    : userInfoText,
      text    : `<INFO>\n${userInfoText}</INFO>\n`,
      role    : llm.ChatRole.SYSTEM,
    });

  if (userMemoryText)
    chatContext.append({
      text    : userMemoryText,
      role    : llm.ChatRole.SYSTEM,
    });
*/

  if (agent.addWeather)
    functionContext.weather = {
      description: 'Get the weather for a given location',
      parameters: z.object({
        location: z.string().describe('The location to get the weather for'),
        //detail  : z.boolean(),
      }),
      execute: async ({ location, detail }) => {
        console.log(`executing weather function for '${location}'`);
        //addSessionMessage(session, agent.useMemory, Prisma.MessageRole.function, `Retrieving weather for '${location}'.`);

        try {
          //const   format                  = detail  ? encodeURIComponent('%C %t, feels like %f, wind %w, pressure %P.') : '%C+%t';
          const format = '%C+%t';
          const response = await fetch(`https://wttr.in/${location}?format=${format}`);
          const weather = response.ok ? await response.text() : undefined;
          //console.info('weather response', response);

          if (weather) return `The weather in ${location} right now is ${weather}.`;
          //return  `The weather in ${location} right now is ${weather.replace(/[←↖↑↗→↘↓↙]/g, (m) => ({ '←': 'easterly ', '↖': 'south-easterly ', '↑': 'southerly ', '↗': 'south-westerly ', '→': 'westerly ', '↘': 'north-westerly ', '↓': 'northerly ', '↙': 'north-easterly ', })[m] ?? m)}.`;
        } catch (error) {
          //console.log('weather error', error);
          // ignored.
        }

        return `Sorry, I'm can't find the weather for ${location}.`;
      },
    };

  agent.sipCalls.forEach((sipCall: Prisma.AgentSipCall) => {
    functionContext[sipCall.name] = {
      description: sipCall.description || `Place a call to ${sipCall.label}.`,
      parameters: z.object({}),
      execute: async ({}) => {
        console.log(`executing SIP call function '${sipCall.name}' to '${sipCall.target}'`);
        //addSessionMessage(session, agent.useMemory, Prisma.MessageRole.function, `Triggering SIP Call '${sipCall.label}'.`);

        try {
          const sipParticipantOptions = {
            participantIdentity: `${sipCall.name}-participant`,
            participantName: sipCall.label,
            //participantMetadata             : string|undefined,
            //participantAttributes           : {},
            dtmf: sipCall.dtmfSent,
            playDialtone: sipCall.diallingTone,
            //headers                         : {},                 // sent as-is, can help identify call as coming from LiveKit
            //includeHeaders                  : sipHeaderOptions,   // automatically map SIP response INVITE headers
            hidePhoneNumber: sipCall.hideNumber ? true : false,
            ringingTimeout: Math.max(0, sipCall.ringTimeout ?? 0) || undefined,
            maxCallDuration: Math.max(0, sipCall.maxDuration ?? 0) || undefined,
          };
          //const   sipParticipantInfo      = await sipClient.createSipParticipant(sipCall.sipTrunkId, sipCall.target, context.room.name ?? '', sipParticipantOptions);
          //
          //console.info('SIP call %o { name:%o, sipTrunkId:%o, target:%o, }', sipParticipantInfo.sipCallId, sipCall.name, sipCall.sipTrunkId, sipCall.target);

          setTimeout(async () => {
            const sipParticipantInfo = await sipClient.createSipParticipant(
              sipCall.sipTrunkId,
              sipCall.target,
              context.room.name ?? '',
              sipParticipantOptions,
            );

            console.info(
              'SIP call %o: { name:%o, sipTrunkId:%o, target:%o, }',
              sipParticipantInfo.sipCallId,
              sipCall.name,
              sipCall.sipTrunkId,
              sipCall.target,
            );
          }, 2500);

          return `Calling ${sipCall.label} now.`;
        } catch (error) {
          console.log(
            'SIP call error { name:%o, sipTrunkId:%o, target:%o, }',
            sipCall.name,
            sipCall.sipTrunkId,
            sipCall.target,
            error,
          );
          // ignored.
        }

        return `Sorry, I'm unable to call ${sipCall.label}.`;
      },
    };
  });

  agent.sipTransfers.forEach((sipTransfer: Prisma.AgentSipTransfer) => {
    functionContext[sipTransfer.name] = {
      description: sipTransfer.description || `Transfer to ${sipTransfer.label}.`,
      parameters: z.object({}),
      execute: async ({}) => {
        console.log(
          `executing SIP transfer function '${sipTransfer.name}' to '${sipTransfer.target}'`,
        );
        //addSessionMessage(session, agent.useMemory, Prisma.MessageRole.function, `Triggering SIP Transfer to '${sipTransfer.label}'.`);

        try {
          const sipTransferOptions = {
            playDialtone: sipTransfer.diallingTone,
            //headers         : {
            //                  },
          };

          //await sipClient.transferSipParticipant('open-room', participant.identity ?? '', sipTransfer.target, sipTransferOptions);
          //console.info('SIP transfer { name:%o, target:%o, }', sipTransfer.name, sipTransfer.target);
          setTimeout(async () => {
            await sipClient.transferSipParticipant(
              'open-room',
              participant.identity ?? '',
              sipTransfer.target,
              sipTransferOptions,
            );
            console.info(
              'SIP transfer { name:%o, target:%o, }',
              sipTransfer.name,
              sipTransfer.target,
            );
          }, 2500);

          return `Transferring caller to ${sipTransfer.label}.`;
        } catch (error) {
          console.log(
            'SIP transfer error { name:%o, target:%o, }',
            sipTransfer.name,
            sipTransfer.target,
            error,
          );
          // ignored.
        }

        return `Sorry, I'm unable to transfer to ${sipTransfer.label}.`;
      },
    };
  });

  const voiceAgent = new multimodal.MultimodalAgent({
    model: realtimeModel,
    chatCtx: chatContext,
    fncCtx: functionContext,
    
  });

  //voiceAgent.on('agent_started_speaking', () => { console.info('agent_started_speaking'); });
  //voiceAgent.on('agent_stopped_speaking', () => { console.info('agent_stopped_speaking'); });
  voiceAgent.on('agent_speech_committed', (message) => {
    //console.info('agent_speech_committed: %o', message.content);
    addSessionMessage(session, agent.useMemory, Prisma.MessageRole.assistant, message.content);
  });
  voiceAgent.on('agent_speech_interupted', (message) => {
    //console.info('agent_speech_interupted: %o', message.content);
    addSessionMessage(session, agent.useMemory, Prisma.MessageRole.assistant, message.content);
  });
  voiceAgent.on('user_speech_committed', (message) => {
    //console.info('user_speech_committed: %o', message.content);
    addSessionMessage(session, agent.useMemory, Prisma.MessageRole.user, message.content);
  });
  //voiceAgent.on('user_started_speaking', () => { console.info('user_started_speaking'); });
  //voiceAgent.on('user_stopped_speaking', () => { console.info('user_stopped_speaking'); });
  //voiceAgent.on('metrics_collected', (metrics: MultimodalLLMMetrics) => {
  ////console.info('metrics_collected', metrics);
  //  prisma.metrics.create({
  //    data    : {
  //                sessionId               : session.id,
  //              //requestId               : metrics.requestId,
  //              //ttft                    : metrics.ttft,
  //                duration                : metrics.duration,
  //              //cancelled               : metrics.cancelled,
  //              //label                   : metrics.label,
  //                completionTokens        : metrics.completionTokens,
  //                promptTokens            : metrics.promptTokens,
  //                totalTokens             : metrics.totalTokens,
  //                tokensPerSecond         : metrics.tokensPerSecond,
  //              //inputCachedTokens       : metrics.inputTokenDetails?.cachedTokens,
  //                inputTextTokens         : metrics.inputTokenDetails?.textTokens,
  //                inputAudioTokens        : metrics.inputTokenDetails?.audioTokens,
  //              //outputCachedTokens      : metrics.outputTokenDetails?.cachedTokens,
  //                outputTextTokens        : metrics.outputTokenDetails?.textTokens,
  //                outputAudioTokens       : metrics.outputTokenDetails?.audioTokens,
  //              },
  //  });
  //});

  //context.room.on(RoomEvent.ChatMessage, (message: ChatMessage, participant?: Participant) => {});
  //context.room.on(RoomEvent.Disconnected, (reason) => {
  //  setTimeout(async () => {
  //    context.shutdown('Session ended');
  //  }, 5000);
  //});
  //context.room.on(RoomEvent.DtmfReceived, (code: number, digit: string, participant: RemoteParticipant) => {});
  //context.room.on(RoomEvent.ParticipantAttributesChanged, (changedAttributes: Record<string, string>, participant: Participant) => {});
  //context.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
  //  voiceAgent.interrupt(true);
  //});
  //context.room.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication, participant: RemoteParticipant) => {});
  //context.room.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {});
  //context.room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant: Participant|undefined, publication: TrackPublication|undefined) => { });

  /*
  context.room.on(RoomEvent.ChatMessage, (message: ChatMessage, participant?: Participant) => { console.log('room @ChatMessage: message=%o; participant.identity=%o.', message, participant?.identity); });
  context.room.on(RoomEvent.Disconnected, (reason) => { consolelog('room @Disconnected: reason=%o.', reason); });
  context.room.on(RoomEvent.DtmfReceived, (code: number, digit: string, participant: RemoteParticipant) => { console.log('room @DtmfReceived: code=%o; digit=%o; participant.identity=%o.', code, digit, participant?.identity); });
  context.room.on(RoomEvent.ParticipantAttributesChanged, (changedAttributes: Record<string, string>, participant: Participant) => { console.log('room @ParticipantAttributesChanged: changed=%o; participant.identity=%o.', changedAttributes, participant?.identity); });
//context.room.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication, participant: RemoteParticipant) => { console.log('room @TrackPublished: publication=%o; participant.identity=%o', publication.name, participant.identity); });
//context.room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant: Participant|undefined, publication: TrackPublication|undefined) => { console.log('room @TranscriptionReceived: segments=%o; participant.identity=%o; publication=%o.', segments, participant?.identity, publication); });
*/

  const agentSession = await voiceAgent.start(context.room, participant).then((session) => {
    const agentSession = session as openai.realtime.RealtimeSession;

    if (agent.greeting) {
      agentSession.conversation.item.create(
        llm.ChatMessage.create({
          role: llm.ChatRole.ASSISTANT,
          text: agent.greeting,
          //images  : [],
        }),
      );

      agentSession.response.create();
    }
  });

  //context.addShutdownCallback(async () => {
  //  void 0;
  //});

  //// shutdown the room when we're finished with it.
  //context.shutdown('Session ended');
};

export default defineAgent({
  entry: startVoiceAgent,
});

cli.runApp(
  new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
  }),
);

////
