import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../../clients/zep';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

async function main() {
  const { groups, totalCount } = await zep.group.listAllGroups();

  if (!groups?.length) {
    console.log('No groups to delete!');
    return;
  }

  for (const g of groups) {
    if (!g.groupId) {
      console.log('No groupId found!');
      continue;
    }

    await zep.group.delete(g.groupId);
  }

  console.log(`Deleted ${totalCount} groups in Zep!`);
  console.log(groups);
}

main();
