import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../../clients/zep';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

async function main() {
  const z = await zep.user.listOrdered({
    pageSize: 100,
    pageNumber: 1,
  });

  console.log(`Found ${z.totalCount} users in Zep!`);
  console.log(z.users);
}

main();
