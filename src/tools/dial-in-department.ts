import type { JobContext } from '@livekit/agents';
import type { RemoteParticipant } from '@livekit/rtc-node';
import { z } from 'zod';
import { sip } from '../clients/sip.js';
import type { Tool } from '../type.js';

const zDepartment = z.enum(['SALES', 'CUSTOMER_SUPPORT']).describe('The department name');

type Department = z.infer<typeof zDepartment>;

const DEPT_SIP_MAP: Record<Department, string> = {
  SALES: 'tel:+9779824920593',
  CUSTOMER_SUPPORT: 'tel:+15105550100',
};

const dialDepartment = async (
  department: Department,
  ctx: JobContext,
  participant: RemoteParticipant,
) => {
  await sip.transferSipParticipant(
    ctx.room.name ?? '', // source room
    participant.identity, // Identity of the SIP participant that should be transferred.
    DEPT_SIP_MAP[department], // transfer_to, tel:+15105550100 sip:+15105550100@sip.telnyx.com
  );
};

export const dialRelavantDepartment: Tool = (user, ctx, participant) => ({
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
      return dialDepartment(department, ctx, participant);
    } catch (error) {
      console.log('Error dialing dept: ', department, error);
      return `Error dialing repartment`;
    }
  },
});
