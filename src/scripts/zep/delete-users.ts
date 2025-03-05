import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../../clients/zep';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

async function main() {
  try {
    const zepUsers = await zep.user.listOrdered({
      pageSize: 100,
      pageNumber: 1,
    });

    const { users, totalCount } = zepUsers;

    console.log(`Found ${totalCount} users in Zep!`);

    if (!users || totalCount === 0) {
      console.log('No users to delete.');
      return;
    }

    console.log('Deleting users...');

    for (const user of users) {
      if (!user.userId) {
        console.error('User ID is missing for user:', user);
        continue;
      }
      await zep.user.delete(user.userId);
    }

    console.log('Users deleted successfully!');
  } catch (error) {
    console.error('Failed to retrieve or process users:', error);
  }
}

main();
