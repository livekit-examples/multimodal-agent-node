import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../clients/zep.js';

// const mockData: Record<string, string> = {
//   delivery:
//     "Schedule home delivery via our 24/7 chatbot by sharing your postal code and preferred time slot. Eco-friendly packaging is optional, and you can add delivery instructions (e.g., 'leave at concierge'). Live GPS tracking lets you follow the rider’s route in real time.",
//   takeaway:
//     'Use our ‘Quick Grab’ feature on the app to pre-order takeaway meals during peak hours. Scan the QR code at the pickup counter to auto-notify staff, avoiding queues. Unlock a free dessert after five takeaway orders through our loyalty program.',
//   ordering:
//     'Order in-store using our digital kiosks with voice command support for accessibility. Split bills with friends via a shared link, or pre-load a ‘Snack Budget’ for impulse add-ons. First-time users get a surprise discount at checkout!',
// };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

async function populateGraphWithDummyData() {
  const groupId = 'food-ordering-help-group';

  await zep.group.add({
    groupId,
    description:
      'This group contains information about home delivery service, takeaway and instore ordering',
    name: 'Food ordering services',
  });

  const data = {
    delivery: {
      title: 'Home Delivery Service',
      description:
        "Schedule home delivery via our 24/7 chatbot by sharing your postal code and preferred time slot. Eco-friendly packaging is optional, and you can add delivery instructions (e.g., 'leave at concierge'). Live GPS tracking lets you follow the rider’s route in real time.",
      features: ['24/7 availability', 'GPS tracking', 'Eco-friendly packaging'],
      category: 'delivery',
    },
    takeaway: {
      title: 'Quick Grab Takeaway',
      description: 'Use our ‘Quick Grab’ feature on the app...',
      features: ['Peak hour pre-order', 'Loyalty rewards', 'QR code pickup'],
      category: 'takeaway',
    },
    ordering: {
      title: 'In-Store Ordering System',
      description: 'Order in-store using our digital kiosks...',
      features: ['Voice commands', 'Bill splitting', 'Snack budget'],
      category: 'ordering',
    },
  };

  try {
    await zep.graph.add({
      groupId: groupId,
      data: JSON.stringify(data),
      type: 'json',
    });
    console.log('Successfully added all food service data to group graph!');
  } catch (error) {
    console.error('Error populating group graph:', error);
  }
}

populateGraphWithDummyData();
