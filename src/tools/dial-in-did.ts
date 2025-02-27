import { z } from 'zod';
import type { Tool } from '../type';

const zDepartment = z.enum(['SALES', 'CUSTOMER_SUPPORT']).describe('The department name');

type Department = z.infer<typeof zDepartment>;

const DEPT_DID_MAP: Record<Department, string> = {
  SALES: '1234',
  CUSTOMER_SUPPORT: '5678',
};

const dialDepartment = async (department: Department) => {
  console.log('Dialign dept ', DEPT_DID_MAP[department]);
};

export const dialRelavantDepartmentDID: Tool = () => ({
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
    return dialDepartment(department);
  },
});
