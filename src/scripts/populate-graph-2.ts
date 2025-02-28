import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../clients/zep.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

async function populateGraphWithSavingMoneyData() {
  const groupId = 'smart-shopping-group';

  await zep.group.add({
    groupId,
    description: 'This group contains tips and strategies to save money when shopping.',
    name: 'Smart Shopping Tips',
  });

  const data = {
    budgeting: {
      title: 'Smart Budgeting',
      description:
        'Plan your shopping with a budget in mind. Use budgeting apps to track expenses and allocate money for essential purchases. Avoid impulse buying by making a shopping list beforehand.',
      features: ['Expense tracking', 'Shopping lists', 'Avoiding impulse buys'],
      category: 'budgeting',
    },
    discounts: {
      title: 'Finding the Best Deals',
      description:
        'Look for discounts, use coupons, and take advantage of cashback offers. Sign up for store loyalty programs to get exclusive savings and track seasonal sales for the best deals.',
      features: ['Coupons & cashback', 'Loyalty programs', 'Seasonal sales'],
      category: 'discounts',
    },
    onlineShopping: {
      title: 'Smart Online Shopping',
      description:
        'Compare prices across multiple websites before making a purchase. Use browser extensions that automatically apply discount codes and check for free shipping options.',
      features: ['Price comparison', 'Discount extensions', 'Free shipping options'],
      category: 'onlineShopping',
    },
  };

  try {
    await zep.graph.add({
      groupId: groupId,
      data: JSON.stringify(data),
      type: 'json',
    });
    console.log('Successfully added all smart shopping data to group graph!');
  } catch (error) {
    console.error('Error populating group graph:', error);
  }
}

populateGraphWithSavingMoneyData();
