import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { zep } from '../../clients/zep';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

const group = {
  groupId: 'recipes',
  name: 'Recipes',
  description: 'Recipes for the business',
};

const DATA = [
  {
    id: 1,
    name: 'Classic Margherita Pizza',
    ingredients: [
      'Pizza dough',
      'Tomato sauce',
      'Fresh mozzarella cheese',
      'Fresh basil leaves',
      'Olive oil',
      'Salt and pepper to taste',
    ],
    instructions: [
      'Preheat the oven to 475°F (245°C).',
      'Roll out the pizza dough and spread tomato sauce evenly.',
      'Top with slices of fresh mozzarella and fresh basil leaves.',
      'Drizzle with olive oil and season with salt and pepper.',
      'Bake in the preheated oven for 12-15 minutes or until the crust is golden brown.',
      'Slice and serve hot.',
    ],
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    servings: 4,
    difficulty: 'Easy',
    cuisine: 'Italian',
    caloriesPerServing: 300,
    tags: ['Pizza', 'Italian'],
    userId: 166,
    image: 'https://cdn.dummyjson.com/recipe-images/1.webp',
    rating: 4.6,
    reviewCount: 98,
    mealType: ['Dinner'],
  },
  {
    id: 2,
    name: 'Vegetarian Stir-Fry',
    ingredients: [
      'Tofu, cubed',
      'Broccoli florets',
      'Carrots, sliced',
      'Bell peppers, sliced',
      'Soy sauce',
      'Ginger, minced',
      'Garlic, minced',
      'Sesame oil',
      'Cooked rice for serving',
    ],
    instructions: [
      'In a wok, heat sesame oil over medium-high heat.',
      'Add minced ginger and garlic, sauté until fragrant.',
      'Add cubed tofu and stir-fry until golden brown.',
      'Add broccoli, carrots, and bell peppers. Cook until vegetables are tender-crisp.',
      'Pour soy sauce over the stir-fry and toss to combine.',
      'Serve over cooked rice.',
    ],
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 3,
    difficulty: 'Medium',
    cuisine: 'Asian',
    caloriesPerServing: 250,
    tags: ['Vegetarian', 'Stir-fry', 'Asian'],
    userId: 143,
    image: 'https://cdn.dummyjson.com/recipe-images/2.webp',
    rating: 4.7,
    reviewCount: 26,
    mealType: ['Lunch'],
  },
  {
    id: 3,
    name: 'Chocolate Chip Cookies',
    ingredients: [
      'All-purpose flour',
      'Butter, softened',
      'Brown sugar',
      'White sugar',
      'Eggs',
      'Vanilla extract',
      'Baking soda',
      'Salt',
      'Chocolate chips',
    ],
    instructions: [
      'Preheat the oven to 350°F (175°C).',
      'In a bowl, cream together softened butter, brown sugar, and white sugar.',
      'Beat in eggs one at a time, then stir in vanilla extract.',
      'Combine flour, baking soda, and salt. Gradually add to the wet ingredients.',
      'Fold in chocolate chips.',
      'Drop rounded tablespoons of dough onto ungreased baking sheets.',
      'Bake for 10-12 minutes or until edges are golden brown.',
      'Allow cookies to cool on the baking sheet for a few minutes before transferring to a wire rack.',
    ],
    prepTimeMinutes: 15,
    cookTimeMinutes: 10,
    servings: 24,
    difficulty: 'Easy',
    cuisine: 'American',
    caloriesPerServing: 150,
    tags: ['Cookies', 'Dessert', 'Baking'],
    userId: 34,
    image: 'https://cdn.dummyjson.com/recipe-images/3.webp',
    rating: 4.9,
    reviewCount: 13,
    mealType: ['Snack', 'Dessert'],
  },
  {
    id: 4,
    name: 'Chicken Alfredo Pasta',
    ingredients: [
      'Fettuccine pasta',
      'Chicken breast, sliced',
      'Heavy cream',
      'Parmesan cheese, grated',
      'Garlic, minced',
      'Butter',
      'Salt and pepper to taste',
      'Fresh parsley for garnish',
    ],
    instructions: [
      'Cook fettuccine pasta according to package instructions.',
      'In a pan, sauté sliced chicken in butter until fully cooked.',
      'Add minced garlic and cook until fragrant.',
      'Pour in heavy cream and grated Parmesan cheese. Stir until the cheese is melted.',
      'Season with salt and pepper to taste.',
      'Combine the Alfredo sauce with cooked pasta.',
      'Garnish with fresh parsley before serving.',
    ],
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: 'Medium',
    cuisine: 'Italian',
    caloriesPerServing: 500,
    tags: ['Pasta', 'Chicken'],
    userId: 136,
    image: 'https://cdn.dummyjson.com/recipe-images/4.webp',
    rating: 4.9,
    reviewCount: 82,
    mealType: ['Lunch', 'Dinner'],
  },
];

async function main() {
  try {
    const { groups } = await zep.group.listAllGroups();

    const alreadyExists = groups?.find((g) => g.groupId === group.groupId);

    if (!alreadyExists) {
      await zep.group.add(group);
    }

    console.log('Adding recipes graph...');
    const g = await zep.graph.add({
      groupId: group.groupId,
      data: JSON.stringify(DATA),
      type: 'json',
    });

    console.log(g);
  } catch (error) {
    console.error(`Error adding recipes graph: ${error}`);
  }
}

main();
