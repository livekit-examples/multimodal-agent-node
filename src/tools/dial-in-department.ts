import type { JobContext } from '@livekit/agents';
import { z } from 'zod';
import { sip } from '../clients/sip.js';
import type { Tool } from '../type.js';

const SIP_PARTICIPANTS = {
  SALES: {
    sipTrunkId: 'ST_MiSwKTmB6QBQ', // sip trunk to use for the call
    number: '+442037951838', // number to dial,
    participantIdentity: 'SALES_TEAM',
    participantName: 'Sales Team',
  },
  SUPPORT: {
    sipTrunkId: 'ST_GvmEnMvCkWtR', // sip trunk to use for the call
    number: '+447771902752', // number to dial
    participantIdentity: 'SUPPORT_TEAM',
    participantName: 'Support Team',
  },
};

const zDepartment = z.enum(['SALES', 'SUPPORT']).describe('The department name');

type Department = z.infer<typeof zDepartment>;

const dialDepartment = async (department: Department, ctx: JobContext) => {
  const sipParticipant = SIP_PARTICIPANTS[department];
  await sip.createSipParticipant(
    sipParticipant.sipTrunkId,
    sipParticipant.number,
    ctx.room.name ?? '',
    {
      playDialtone: true,
      krispEnabled: true,
      participantIdentity: sipParticipant.participantIdentity,
      participantName: sipParticipant.participantName,
    },
  );
};

export const dialRelavantDepartment: Tool = (user, ctx) => ({
  description: `Called when the user wants assistance from a specific department 
        
        The possible departments are:
        1. Sales department
        2. Customer support department
        `,

  parameters: z.object({
    department: zDepartment,
  }),
  execute: async ({ department }) => {
    console.debug(`executing dialRelavantDepartmentDID function for ${department}`);
    try {
      await dialDepartment(department, ctx);
      return `Calling ${department} now.`;
    } catch (error) {
      console.log('Error dialing dept: ', department, error);
      return `Error dialing repartment`;
    }
  },
});
