import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../../clients/zep';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

const GROUP_ID = 'volkswagen-cars';

const CAR_DATA = [
  {
    name: 'VW 123',
    year: 2020,
    price: 20000,
  },
  {
    name: 'VW 456',
    year: 2021,
    price: 30000,
  },
];

async function main() {
  try {
    console.log('Adding car data graph...');

    // const edges = await zep.graph.search({
    //   groupId: GROUP_ID,
    //   query: 'VW Passat',
    //   scope: 'edges',
    // });

    // const nodes = await zep.graph.search({
    //   groupId: GROUP_ID,
    //   query: 'VW Passat',
    //   scope: 'edges',
    // });

    //* Group Add
    // await zep.group.add({
    //   groupId: GROUP_ID,
    //   name: 'VW Cars!',
    //   description: 'VW Cars for users!',
    // });

    //* Multiple Json Add
    // Add car data to the graph
    // for (const car of CAR_DATA) {
    //   await zep.graph.add({
    //     groupId: GROUP_ID,
    //     data: JSON.stringify(car),
    //     type: 'json',
    //   });
    // }

    //* Message Add
    // await zep.graph.add({
    //   groupId: GROUP_ID,
    //   data: 'Hello World!',
    //   type: 'text',
    // });

    //* Single Json Add
    // const passat = {
    //   name: 'VW Demo',
    //   year: 2022,
    //   price: 40000,
    // };

    // const g = await zep.graph.add({
    //   groupId: GROUP_ID,
    //   data: JSON.stringify(CAR_DATA),
    //   type: 'json',
    // });

    const episodes = await zep.graph.episode.getByGroupId(GROUP_ID);

    // console.log(JSON.stringify(episode, null, 2));

    // console.log(g);
  } catch (error) {
    console.error(`Error adding car data graph: ${error}`);
  }
}

main();
