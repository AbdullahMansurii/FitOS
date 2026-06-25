import type { CuratedFood } from '@/types'

export const CURATED_FOODS: CuratedFood[] = [
  // ─── Eggs & Egg Varieties ──────────────────────────────────────────────────
  {
    id: 'curated-egg-white-raw',
    name: 'Egg White, Raw',
    aliases: ['egg white', 'egg whites', 'egg-white', 'egg-whites', 'safedi', 'ande ki safedi'],
    caloriesPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 33 },
      { name: 'egg white', weightG: 33 },
      { name: 'egg', weightG: 33 }
    ]
  },
  {
    id: 'curated-egg-white-boiled',
    name: 'Egg White, Boiled',
    aliases: ['boiled egg white', 'boiled egg whites', 'boiled whites'],
    caloriesPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 33 },
      { name: 'egg white', weightG: 33 },
      { name: 'egg', weightG: 33 }
    ]
  },
  {
    id: 'curated-whole-egg-raw',
    name: 'Whole Egg, Raw',
    aliases: ['egg', 'eggs', 'whole egg', 'whole eggs', 'raw egg', 'raw eggs', 'anda', 'ande'],
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'egg', weightG: 50 }
    ]
  },
  {
    id: 'curated-boiled-egg',
    name: 'Egg, Whole, Boiled',
    aliases: ['boiled egg', 'boiled eggs', 'boiled whole egg', 'boiled whole eggs', 'ubla anda'],
    caloriesPer100g: 155,
    proteinPer100g: 12.6,
    carbsPer100g: 1.1,
    fatPer100g: 10.6,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'egg', weightG: 50 }
    ]
  },
  {
    id: 'curated-fried-egg',
    name: 'Egg, Whole, Fried',
    aliases: ['fried egg', 'fried eggs', 'sunny side up', 'half fry', 'bullseye', 'fried eggs'],
    caloriesPer100g: 196,
    proteinPer100g: 13.6,
    carbsPer100g: 0.9,
    fatPer100g: 14.8,
    servingSizes: [
      { name: 'piece', weightG: 55 },
      { name: 'egg', weightG: 50 }
    ]
  },
  {
    id: 'curated-omelette',
    name: 'Egg Omelette (2 Eggs)',
    aliases: ['omelette', 'egg omelette', 'omelet', 'double omelette'],
    caloriesPer100g: 182,
    proteinPer100g: 10.5,
    carbsPer100g: 1.4,
    fatPer100g: 14.5,
    servingSizes: [
      { name: 'piece', weightG: 110 },
      { name: 'serving', weightG: 110 }
    ]
  },
  {
    id: 'curated-egg-bhurji',
    name: 'Egg Bhurji (Scrambled Eggs)',
    aliases: ['egg bhurji', 'scrambled egg bhurji', 'ande ka bhurji', 'bhurji'],
    caloriesPer100g: 160,
    proteinPer100g: 11.2,
    carbsPer100g: 3.5,
    fatPer100g: 11.2,
    servingSizes: [
      { name: 'bowl', weightG: 150 },
      { name: 'plate', weightG: 200 },
      { name: 'katori', weightG: 120 }
    ]
  },

  // ─── Chicken & Meats ────────────────────────────────────────────────────────
  {
    id: 'curated-chicken-breast-raw',
    name: 'Chicken Breast, Raw',
    aliases: ['chicken breast', 'chicken breasts', 'raw chicken', 'raw chicken breast', 'raw chicken breasts'],
    caloriesPer100g: 120,
    proteinPer100g: 22.5,
    carbsPer100g: 0,
    fatPer100g: 2.6,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'fillet', weightG: 150 },
      { name: 'serving', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-breast-cooked',
    name: 'Chicken Breast, Cooked',
    aliases: ['cooked chicken breast', 'cooked chicken breasts', 'boiled chicken', 'grilled chicken breast', 'cooked chicken'],
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    servingSizes: [
      { name: 'cup', weightG: 140 },
      { name: 'serving', weightG: 150 },
      { name: 'piece', weightG: 120 }
    ]
  },
  {
    id: 'curated-chicken-thigh-raw',
    name: 'Chicken Thigh, Raw',
    aliases: ['chicken thigh', 'chicken thighs', 'raw chicken thigh', 'raw chicken thighs'],
    caloriesPer100g: 120,
    proteinPer100g: 19,
    carbsPer100g: 0,
    fatPer100g: 5,
    servingSizes: [
      { name: 'piece', weightG: 100 },
      { name: 'thigh', weightG: 100 },
      { name: 'serving', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-thigh-cooked',
    name: 'Chicken Thigh, Cooked',
    aliases: ['cooked chicken thigh', 'cooked chicken thighs', 'grilled chicken thigh', 'grilled chicken thighs'],
    caloriesPer100g: 177,
    proteinPer100g: 24,
    carbsPer100g: 0,
    fatPer100g: 8,
    servingSizes: [
      { name: 'piece', weightG: 85 },
      { name: 'thigh', weightG: 85 },
      { name: 'serving', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-curry',
    name: 'Chicken Curry',
    aliases: ['chicken curry', 'chicken gravy', 'chicken sabzi', 'murgh curry'],
    caloriesPer100g: 140,
    proteinPer100g: 13.5,
    carbsPer100g: 3.2,
    fatPer100g: 8.2,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 350 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-butter-chicken',
    name: 'Butter Chicken',
    aliases: ['butter chicken', 'chicken butter masala', 'murgh makhani'],
    caloriesPer100g: 210,
    proteinPer100g: 13,
    carbsPer100g: 6,
    fatPer100g: 15,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 350 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-tandoori-chicken',
    name: 'Tandoori Chicken',
    aliases: ['tandoori chicken', 'chicken tandoori', 'tandoori leg', 'tandoori breast'],
    caloriesPer100g: 160,
    proteinPer100g: 22,
    carbsPer100g: 2,
    fatPer100g: 7,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'leg', weightG: 150 },
      { name: 'breast', weightG: 200 },
      { name: 'serving', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-tikka',
    name: 'Chicken Tikka',
    aliases: ['chicken tikka', 'grilled chicken tikka'],
    caloriesPer100g: 150,
    proteinPer100g: 24,
    carbsPer100g: 1.5,
    fatPer100g: 5,
    servingSizes: [
      { name: 'plate', weightG: 200 },
      { name: 'skewer', weightG: 150 },
      { name: 'piece', weightG: 30 }
    ]
  },
  {
    id: 'curated-mutton-curry',
    name: 'Mutton Curry',
    aliases: ['mutton curry', 'goat curry', 'mutton gravy'],
    caloriesPer100g: 180,
    proteinPer100g: 16,
    carbsPer100g: 4,
    fatPer100g: 11,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 350 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-fish-curry',
    name: 'Fish Curry',
    aliases: ['fish curry', 'fish gravy', 'machhi curry'],
    caloriesPer100g: 120,
    proteinPer100g: 15,
    carbsPer100g: 3,
    fatPer100g: 5,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 300 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-grilled-fish',
    name: 'Grilled Fish',
    aliases: ['grilled fish', 'baked fish', 'roasted fish'],
    caloriesPer100g: 140,
    proteinPer100g: 22,
    carbsPer100g: 0,
    fatPer100g: 5.5,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'fillet', weightG: 150 },
      { name: 'serving', weightG: 150 }
    ]
  },

  // ─── Vegetarian Proteins & Staples ──────────────────────────────────────────
  {
    id: 'curated-paneer',
    name: 'Paneer (Cottage Cheese)',
    aliases: ['paneer', 'cottage cheese', 'paneer block', 'paneer cubes'],
    caloriesPer100g: 265,
    proteinPer100g: 18,
    carbsPer100g: 1.2,
    fatPer100g: 20,
    servingSizes: [
      { name: 'piece', weightG: 20 },
      { name: 'cube', weightG: 15 },
      { name: 'block', weightG: 200 },
      { name: 'serving', weightG: 100 }
    ]
  },
  {
    id: 'curated-paneer-bhurji',
    name: 'Paneer Bhurji',
    aliases: ['paneer bhurji', 'scrambled paneer', 'bhurji paneer'],
    caloriesPer100g: 190,
    proteinPer100g: 12,
    carbsPer100g: 4,
    fatPer100g: 14,
    servingSizes: [
      { name: 'bowl', weightG: 150 },
      { name: 'plate', weightG: 200 },
      { name: 'katori', weightG: 120 }
    ]
  },
  {
    id: 'curated-paneer-butter-masala',
    name: 'Paneer Butter Masala',
    aliases: ['paneer butter masala', 'paneer makhani', 'shahi paneer'],
    caloriesPer100g: 220,
    proteinPer100g: 8,
    carbsPer100g: 8,
    fatPer100g: 18,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 300 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-palak-paneer',
    name: 'Palak Paneer',
    aliases: ['palak paneer', 'spinach paneer'],
    caloriesPer100g: 140,
    proteinPer100g: 8,
    carbsPer100g: 5,
    fatPer100g: 10,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 250 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-tofu',
    name: 'Tofu (Firm)',
    aliases: ['tofu', 'soy curd', 'firm tofu', 'tofu block'],
    caloriesPer100g: 80,
    proteinPer100g: 8,
    carbsPer100g: 1.9,
    fatPer100g: 4.7,
    servingSizes: [
      { name: 'piece', weightG: 20 },
      { name: 'block', weightG: 200 },
      { name: 'serving', weightG: 100 }
    ]
  },
  {
    id: 'curated-soya-chunks-raw',
    name: 'Soya Chunks, Raw',
    aliases: ['soya chunks', 'nutrela', 'soya nuggets', 'soy chunks', 'raw soya chunks'],
    caloriesPer100g: 345,
    proteinPer100g: 52,
    carbsPer100g: 33,
    fatPer100g: 0.5,
    servingSizes: [
      { name: 'cup', weightG: 30 },
      { name: 'bowl', weightG: 30 },
      { name: 'scoop', weightG: 30 }
    ]
  },
  {
    id: 'curated-soya-chunks-cooked',
    name: 'Soya Chunks, Cooked',
    aliases: ['cooked soya chunks', 'cooked soy chunks', 'boiled soya chunks', 'boiled soya'],
    caloriesPer100g: 105,
    proteinPer100g: 15,
    carbsPer100g: 10,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'bowl', weightG: 150 },
      { name: 'cup', weightG: 100 }
    ]
  },
  {
    id: 'curated-dal-makhani',
    name: 'Dal Makhani',
    aliases: ['dal makhani', 'makhani dal', 'black dal'],
    caloriesPer100g: 130,
    proteinPer100g: 5.0,
    carbsPer100g: 16.5,
    fatPer100g: 4.8,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 250 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-dal-tadka',
    name: 'Dal Tadka (Cooked Moong/Toor)',
    aliases: ['dal', 'cooked dal', 'moong dal', 'toor dal', 'yellow dal', 'dal tadka', 'lentils curry'],
    caloriesPer100g: 105,
    proteinPer100g: 5.5,
    carbsPer100g: 15,
    fatPer100g: 2.5,
    servingSizes: [
      { name: 'bowl', weightG: 150 },
      { name: 'cup', weightG: 150 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-kadai-paneer',
    name: 'Kadai Paneer',
    aliases: ['kadai paneer', 'karahi paneer'],
    caloriesPer100g: 190,
    proteinPer100g: 9.5,
    carbsPer100g: 6,
    fatPer100g: 14.2,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 300 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-matar-paneer',
    name: 'Matar Paneer',
    aliases: ['matar paneer', 'mutter paneer'],
    caloriesPer100g: 160,
    proteinPer100g: 8.5,
    carbsPer100g: 7.2,
    fatPer100g: 11,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 300 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-chana-masala',
    name: 'Chana Masala (Chole)',
    aliases: ['chole', 'cooked chole', 'chana', 'cooked chana', 'chickpeas', 'chickpea curry', 'chana masala'],
    caloriesPer100g: 150,
    proteinPer100g: 5,
    carbsPer100g: 20,
    fatPer100g: 5,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'cup', weightG: 150 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-rajma',
    name: 'Rajma Masala',
    aliases: ['rajma', 'cooked rajma', 'kidney beans curry', 'kidney beans', 'rajma masala'],
    caloriesPer100g: 120,
    proteinPer100g: 4.8,
    carbsPer100g: 16,
    fatPer100g: 4,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'cup', weightG: 150 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-aloo-palak',
    name: 'Aloo Palak',
    aliases: ['aloo palak', 'potato spinach'],
    caloriesPer100g: 90,
    proteinPer100g: 2.2,
    carbsPer100g: 11,
    fatPer100g: 4,
    servingSizes: [
      { name: 'bowl', weightG: 180 },
      { name: 'katori', weightG: 130 }
    ]
  },
  {
    id: 'curated-mix-veg',
    name: 'Mixed Vegetable Curry',
    aliases: ['mix veg', 'mixed veg', 'mixed veg curry', 'sabzi'],
    caloriesPer100g: 95,
    proteinPer100g: 2.5,
    carbsPer100g: 10,
    fatPer100g: 5,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 250 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-bhindi-masala',
    name: 'Bhindi Masala (Okra Curry)',
    aliases: ['bhindi', 'bhindi masala', 'okra sabzi', 'bhindi fry'],
    caloriesPer100g: 110,
    proteinPer100g: 2,
    carbsPer100g: 10,
    fatPer100g: 7,
    servingSizes: [
      { name: 'bowl', weightG: 150 },
      { name: 'katori', weightG: 120 }
    ]
  },
  {
    id: 'curated-baingan-bharta',
    name: 'Baingan Bharta',
    aliases: ['baingan bharta', 'eggplant bharta', 'baingan ka bharta'],
    caloriesPer100g: 80,
    proteinPer100g: 1.5,
    carbsPer100g: 8,
    fatPer100g: 4.8,
    servingSizes: [
      { name: 'bowl', weightG: 180 },
      { name: 'katori', weightG: 130 }
    ]
  },
  {
    id: 'curated-aloo-gobhi',
    name: 'Aloo Gobhi',
    aliases: ['aloo gobhi', 'aloo gobi', 'potato cauliflower sabzi'],
    caloriesPer100g: 110,
    proteinPer100g: 2.4,
    carbsPer100g: 13,
    fatPer100g: 5.5,
    servingSizes: [
      { name: 'bowl', weightG: 180 },
      { name: 'katori', weightG: 130 }
    ]
  },

  // ─── Flatbreads ─────────────────────────────────────────────────────────────
  {
    id: 'curated-roti',
    name: 'Roti / Chapati (Whole Wheat)',
    aliases: ['roti', 'rotis', 'chapati', 'chapatis', 'phulka', 'fulka'],
    caloriesPer100g: 264,
    proteinPer100g: 9,
    carbsPer100g: 56,
    fatPer100g: 1.5,
    servingSizes: [
      { name: 'piece', weightG: 40 },
      { name: 'roti', weightG: 40 },
      { name: 'chapati', weightG: 40 }
    ]
  },
  {
    id: 'curated-butter-roti',
    name: 'Butter Roti (Whole Wheat)',
    aliases: ['butter roti', 'butter chapati', 'butter chapatis', 'butter rotis'],
    caloriesPer100g: 310,
    proteinPer100g: 8.5,
    carbsPer100g: 53,
    fatPer100g: 7,
    servingSizes: [
      { name: 'piece', weightG: 45 },
      { name: 'roti', weightG: 45 }
    ]
  },
  {
    id: 'curated-thepla',
    name: 'Thepla (Fenugreek Flatbread)',
    aliases: ['thepla', 'theplas', 'methi thepla', 'methi theplas'],
    caloriesPer100g: 280,
    proteinPer100g: 7.5,
    carbsPer100g: 48,
    fatPer100g: 6.5,
    servingSizes: [
      { name: 'piece', weightG: 35 },
      { name: 'thepla', weightG: 35 }
    ]
  },
  {
    id: 'curated-naan-plain',
    name: 'Naan (Plain)',
    aliases: ['naan', 'plain naan'],
    caloriesPer100g: 290,
    proteinPer100g: 8,
    carbsPer100g: 52,
    fatPer100g: 5.5,
    servingSizes: [
      { name: 'piece', weightG: 90 },
      { name: 'naan', weightG: 90 }
    ]
  },
  {
    id: 'curated-naan-butter',
    name: 'Butter Naan',
    aliases: ['butter naan'],
    caloriesPer100g: 330,
    proteinPer100g: 8,
    carbsPer100g: 50,
    fatPer100g: 10,
    servingSizes: [
      { name: 'piece', weightG: 100 },
      { name: 'naan', weightG: 100 }
    ]
  },
  {
    id: 'curated-tandoori-roti',
    name: 'Tandoori Roti',
    aliases: ['tandoori roti'],
    caloriesPer100g: 260,
    proteinPer100g: 8.5,
    carbsPer100g: 54,
    fatPer100g: 1.2,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'roti', weightG: 50 }
    ]
  },
  {
    id: 'curated-paratha-plain',
    name: 'Paratha (Plain)',
    aliases: ['paratha', 'plain paratha', 'parathas', 'sada paratha'],
    caloriesPer100g: 326,
    proteinPer100g: 6.5,
    carbsPer100g: 48,
    fatPer100g: 12,
    servingSizes: [
      { name: 'piece', weightG: 80 },
      { name: 'paratha', weightG: 80 }
    ]
  },
  {
    id: 'curated-aloo-paratha',
    name: 'Aloo Paratha',
    aliases: ['aloo paratha', 'potato paratha', 'aloo ka paratha'],
    caloriesPer100g: 245,
    proteinPer100g: 5,
    carbsPer100g: 38,
    fatPer100g: 8,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'paratha', weightG: 150 }
    ]
  },
  {
    id: 'curated-paneer-paratha',
    name: 'Paneer Paratha',
    aliases: ['paneer paratha', 'cheese paratha', 'paneer ka paratha'],
    caloriesPer100g: 280,
    proteinPer100g: 10.5,
    carbsPer100g: 36,
    fatPer100g: 10,
    servingSizes: [
      { name: 'piece', weightG: 160 },
      { name: 'paratha', weightG: 160 }
    ]
  },
  {
    id: 'curated-pav',
    name: 'Pav (Indian Roll)',
    aliases: ['pav', 'laadi pav', 'pavs'],
    caloriesPer100g: 270,
    proteinPer100g: 8,
    carbsPer100g: 53,
    fatPer100g: 2.5,
    servingSizes: [
      { name: 'piece', weightG: 45 },
      { name: 'pav', weightG: 45 }
    ]
  },
  {
    id: 'curated-puri',
    name: 'Puri',
    aliases: ['puri', 'poori', 'puris'],
    caloriesPer100g: 380,
    proteinPer100g: 6.5,
    carbsPer100g: 48,
    fatPer100g: 18,
    servingSizes: [
      { name: 'piece', weightG: 25 },
      { name: 'puri', weightG: 25 }
    ]
  },
  {
    id: 'curated-bhatura',
    name: 'Bhatura',
    aliases: ['bhatura', 'bhature', 'bhatoora'],
    caloriesPer100g: 390,
    proteinPer100g: 7.2,
    carbsPer100g: 50,
    fatPer100g: 18,
    servingSizes: [
      { name: 'piece', weightG: 75 },
      { name: 'bhatura', weightG: 75 }
    ]
  },

  // ─── Rice & Rice Dishes ─────────────────────────────────────────────────────
  {
    id: 'curated-white-rice-cooked',
    name: 'White Rice, Cooked',
    aliases: ['rice', 'chawal', 'cooked rice', 'white rice', 'cooked white rice', 'boiled rice'],
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 180 },
      { name: 'katori', weightG: 150 },
      { name: 'plate', weightG: 250 }
    ]
  },
  {
    id: 'curated-brown-rice-cooked',
    name: 'Brown Rice, Cooked',
    aliases: ['cooked brown rice', 'brown rice', 'boiled brown rice'],
    caloriesPer100g: 112,
    proteinPer100g: 2.3,
    carbsPer100g: 23.5,
    fatPer100g: 0.8,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 180 },
      { name: 'katori', weightG: 150 },
      { name: 'plate', weightG: 250 }
    ]
  },
  {
    id: 'curated-khichdi',
    name: 'Khichdi',
    aliases: ['khichdi', 'khichri', 'cooked khichdi'],
    caloriesPer100g: 115,
    proteinPer100g: 3.5,
    carbsPer100g: 20,
    fatPer100g: 2.5,
    servingSizes: [
      { name: 'plate', weightG: 250 },
      { name: 'bowl', weightG: 200 },
      { name: 'cup', weightG: 150 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-jeera-rice',
    name: 'Jeera Rice',
    aliases: ['jeera rice', 'cumin rice'],
    caloriesPer100g: 140,
    proteinPer100g: 2.8,
    carbsPer100g: 29,
    fatPer100g: 1.2,
    servingSizes: [
      { name: 'bowl', weightG: 180 },
      { name: 'plate', weightG: 250 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-veg-biryani',
    name: 'Vegetable Biryani',
    aliases: ['veg biryani', 'vegetable biryani'],
    caloriesPer100g: 150,
    proteinPer100g: 3.5,
    carbsPer100g: 24,
    fatPer100g: 4.5,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 400 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-biryani',
    name: 'Chicken Biryani',
    aliases: ['chicken biryani', 'chicken biriyani', 'biryani'],
    caloriesPer100g: 180,
    proteinPer100g: 9,
    carbsPer100g: 22,
    fatPer100g: 6.5,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 400 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-egg-biryani',
    name: 'Egg Biryani',
    aliases: ['egg biryani', 'anda biryani'],
    caloriesPer100g: 165,
    proteinPer100g: 7,
    carbsPer100g: 23,
    fatPer100g: 5,
    servingSizes: [
      { name: 'bowl', weightG: 250 },
      { name: 'plate', weightG: 400 },
      { name: 'katori', weightG: 150 }
    ]
  },
  {
    id: 'curated-egg-fried-rice',
    name: 'Egg Fried Rice',
    aliases: ['egg fried rice', 'anda fried rice'],
    caloriesPer100g: 175,
    proteinPer100g: 5.5,
    carbsPer100g: 26,
    fatPer100g: 5.2,
    servingSizes: [
      { name: 'bowl', weightG: 220 },
      { name: 'plate', weightG: 320 },
      { name: 'cup', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-fried-rice',
    name: 'Chicken Fried Rice',
    aliases: ['chicken fried rice'],
    caloriesPer100g: 185,
    proteinPer100g: 8.5,
    carbsPer100g: 25,
    fatPer100g: 5.8,
    servingSizes: [
      { name: 'bowl', weightG: 220 },
      { name: 'plate', weightG: 320 },
      { name: 'cup', weightG: 150 }
    ]
  },
  {
    id: 'curated-schezwan-fried-rice',
    name: 'Schezwan Fried Rice',
    aliases: ['schezwan fried rice', 'schezwan rice'],
    caloriesPer100g: 180,
    proteinPer100g: 4,
    carbsPer100g: 28,
    fatPer100g: 5.5,
    servingSizes: [
      { name: 'bowl', weightG: 220 },
      { name: 'plate', weightG: 320 }
    ]
  },
  {
    id: 'curated-noodles',
    name: 'Hakka Noodles',
    aliases: ['noodles', 'hakka noodles', 'veg noodles', 'chow mein', 'chicken noodles'],
    caloriesPer100g: 160,
    proteinPer100g: 4.5,
    carbsPer100g: 26,
    fatPer100g: 4.2,
    servingSizes: [
      { name: 'bowl', weightG: 200 },
      { name: 'plate', weightG: 300 }
    ]
  },

  // ─── Indian Snacks & Street Foods ──────────────────────────────────────────
  {
    id: 'curated-samosa',
    name: 'Samosa',
    aliases: ['samosa', 'samosas', 'singara'],
    caloriesPer100g: 262,
    proteinPer100g: 4.5,
    carbsPer100g: 32,
    fatPer100g: 13,
    servingSizes: [
      { name: 'piece', weightG: 75 },
      { name: 'samosa', weightG: 75 }
    ]
  },
  {
    id: 'curated-vada-pav',
    name: 'Vada Pav',
    aliases: ['vada pav', 'vadapav', 'wada pav'],
    caloriesPer100g: 290,
    proteinPer100g: 6,
    carbsPer100g: 42,
    fatPer100g: 11,
    servingSizes: [
      { name: 'piece', weightG: 120 },
      { name: 'vada pav', weightG: 120 }
    ]
  },
  {
    id: 'curated-pav-bhaji',
    name: 'Pav Bhaji',
    aliases: ['pav bhaji', 'pavbhaji'],
    caloriesPer100g: 160,
    proteinPer100g: 4.2,
    carbsPer100g: 21,
    fatPer100g: 6.8,
    servingSizes: [
      { name: 'plate', weightG: 300 },
      { name: 'serving', weightG: 300 },
      { name: 'bowl', weightG: 200 } // bhaji only
    ]
  },
  {
    id: 'curated-bhel-puri',
    name: 'Bhel Puri',
    aliases: ['bhel puri', 'bhelpuri', 'bhel'],
    caloriesPer100g: 180,
    proteinPer100g: 4,
    carbsPer100g: 32,
    fatPer100g: 4,
    servingSizes: [
      { name: 'plate', weightG: 120 },
      { name: 'serving', weightG: 120 }
    ]
  },
  {
    id: 'curated-sev-puri',
    name: 'Sev Puri',
    aliases: ['sev puri', 'sevpuri'],
    caloriesPer100g: 240,
    proteinPer100g: 5,
    carbsPer100g: 34,
    fatPer100g: 9.5,
    servingSizes: [
      { name: 'plate', weightG: 150 },
      { name: 'serving', weightG: 150 },
      { name: 'piece', weightG: 25 } // 1 puri loaded
    ]
  },
  {
    id: 'curated-pani-puri',
    name: 'Pani Puri',
    aliases: ['pani puri', 'panipuri', 'golgappa', 'puchka', 'golgappas'],
    caloriesPer100g: 150,
    proteinPer100g: 3,
    carbsPer100g: 26,
    fatPer100g: 4,
    servingSizes: [
      { name: 'piece', weightG: 15 },
      { name: 'plate', weightG: 90 } // 6 pieces
    ]
  },
  {
    id: 'curated-dhokla',
    name: 'Khaman Dhokla',
    aliases: ['dhokla', 'khaman dhokla', 'khaman'],
    caloriesPer100g: 160,
    proteinPer100g: 6,
    carbsPer100g: 28,
    fatPer100g: 2.8,
    servingSizes: [
      { name: 'piece', weightG: 40 },
      { name: 'dhokla', weightG: 40 },
      { name: 'plate', weightG: 160 }
    ]
  },
  {
    id: 'curated-khandvi',
    name: 'Khandvi',
    aliases: ['khandvi', 'khandvis'],
    caloriesPer100g: 130,
    proteinPer100g: 4.8,
    carbsPer100g: 16,
    fatPer100g: 5.2,
    servingSizes: [
      { name: 'piece', weightG: 20 },
      { name: 'plate', weightG: 120 }
    ]
  },
  {
    id: 'curated-medu-vada',
    name: 'Medu Vada',
    aliases: ['medu vada', 'vada', 'sambar vada', 'meduvada'],
    caloriesPer100g: 320,
    proteinPer100g: 7.2,
    carbsPer100g: 36,
    fatPer100g: 16.5,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'vada', weightG: 50 }
    ]
  },
  {
    id: 'curated-batata-vada',
    name: 'Batata Vada',
    aliases: ['batata vada', 'potato vada', 'batatavada'],
    caloriesPer100g: 240,
    proteinPer100g: 3.5,
    carbsPer100g: 26,
    fatPer100g: 13.5,
    servingSizes: [
      { name: 'piece', weightG: 60 },
      { name: 'vada', weightG: 60 }
    ]
  },
  {
    id: 'curated-kachori',
    name: 'Kachori',
    aliases: ['kachori', 'khasta kachori', 'kachoris'],
    caloriesPer100g: 380,
    proteinPer100g: 7,
    carbsPer100g: 46,
    fatPer100g: 18.5,
    servingSizes: [
      { name: 'piece', weightG: 80 },
      { name: 'kachori', weightG: 80 }
    ]
  },
  {
    id: 'curated-aloo-tikki',
    name: 'Aloo Tikki',
    aliases: ['aloo tikki', 'tikki'],
    caloriesPer100g: 175,
    proteinPer100g: 2.8,
    carbsPer100g: 25,
    fatPer100g: 7.2,
    servingSizes: [
      { name: 'piece', weightG: 70 },
      { name: 'tikki', weightG: 70 }
    ]
  },

  // ─── Fast Food & Restaurant (Western) ───────────────────────────────────────
  {
    id: 'curated-chicken-burger',
    name: 'Chicken Burger',
    aliases: ['chicken burger', 'mcchicken', 'crispy chicken burger'],
    caloriesPer100g: 250,
    proteinPer100g: 12,
    carbsPer100g: 28,
    fatPer100g: 10,
    servingSizes: [
      { name: 'piece', weightG: 200 },
      { name: 'burger', weightG: 200 }
    ]
  },
  {
    id: 'curated-veg-burger',
    name: 'Veg Burger',
    aliases: ['veg burger', 'vegetable burger', 'mcveggie', 'aloo tikki burger'],
    caloriesPer100g: 230,
    proteinPer100g: 6.5,
    carbsPer100g: 34,
    fatPer100g: 7.5,
    servingSizes: [
      { name: 'piece', weightG: 180 },
      { name: 'burger', weightG: 180 }
    ]
  },
  {
    id: 'curated-cheese-burger',
    name: 'Cheese Burger',
    aliases: ['cheese burger', 'hamburger with cheese'],
    caloriesPer100g: 280,
    proteinPer100g: 14.2,
    carbsPer100g: 27,
    fatPer100g: 12.8,
    servingSizes: [
      { name: 'piece', weightG: 175 },
      { name: 'burger', weightG: 175 }
    ]
  },
  {
    id: 'curated-pizza-veg',
    name: 'Pizza (Veg Slice)',
    aliases: ['pizza', 'veg pizza', 'pizza slice', 'margherita pizza'],
    caloriesPer100g: 250,
    proteinPer100g: 9.8,
    carbsPer100g: 32,
    fatPer100g: 8.8,
    servingSizes: [
      { name: 'slice', weightG: 125 },
      { name: 'piece', weightG: 125 },
      { name: 'whole medium', weightG: 500 }
    ]
  },
  {
    id: 'curated-pizza-chicken',
    name: 'Pizza (Chicken Slice)',
    aliases: ['chicken pizza', 'chicken pizza slice'],
    caloriesPer100g: 270,
    proteinPer100g: 12.5,
    carbsPer100g: 30,
    fatPer100g: 10.5,
    servingSizes: [
      { name: 'slice', weightG: 130 },
      { name: 'piece', weightG: 130 },
      { name: 'whole medium', weightG: 520 }
    ]
  },
  {
    id: 'curated-french-fries',
    name: 'French Fries',
    aliases: ['french fries', 'fries', 'finger chips'],
    caloriesPer100g: 312,
    proteinPer100g: 3.4,
    carbsPer100g: 41,
    fatPer100g: 15,
    servingSizes: [
      { name: 'serving', weightG: 117 },
      { name: 'plate', weightG: 150 },
      { name: 'medium', weightG: 117 },
      { name: 'large', weightG: 154 }
    ]
  },
  {
    id: 'curated-chicken-nuggets',
    name: 'Chicken Nuggets',
    aliases: ['chicken nuggets', 'nuggets', 'chicken nugget'],
    caloriesPer100g: 290,
    proteinPer100g: 15.5,
    carbsPer100g: 18,
    fatPer100g: 17,
    servingSizes: [
      { name: 'piece', weightG: 16 },
      { name: 'serving', weightG: 100 } // approx 6 pieces
    ]
  },
  {
    id: 'curated-veg-sandwich',
    name: 'Veg Sandwich',
    aliases: ['veg sandwich', 'vegetable sandwich', 'club sandwich veg'],
    caloriesPer100g: 160,
    proteinPer100g: 4,
    carbsPer100g: 28,
    fatPer100g: 3.5,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'sandwich', weightG: 150 }
    ]
  },
  {
    id: 'curated-chicken-sandwich',
    name: 'Chicken Sandwich',
    aliases: ['chicken sandwich', 'chicken club sandwich'],
    caloriesPer100g: 220,
    proteinPer100g: 14.5,
    carbsPer100g: 26,
    fatPer100g: 6.8,
    servingSizes: [
      { name: 'piece', weightG: 180 },
      { name: 'sandwich', weightG: 180 }
    ]
  },

  // ─── Dairy ──────────────────────────────────────────────────────────────────
  {
    id: 'curated-milk',
    name: 'Milk (Plain Cow)',
    aliases: ['milk', 'doodh', 'whole milk', 'regular milk', 'cow milk'],
    caloriesPer100g: 60,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.0,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 },
      { name: 'ml', weightG: 1 }
    ]
  },
  {
    id: 'curated-milk-buffalo',
    name: 'Buffalo Milk (Plain)',
    aliases: ['buffalo milk', 'doodh buffalo'],
    caloriesPer100g: 97,
    proteinPer100g: 3.7,
    carbsPer100g: 5.0,
    fatPer100g: 6.9,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 },
      { name: 'ml', weightG: 1 }
    ]
  },
  {
    id: 'curated-milk-skimmed',
    name: 'Skimmed Milk',
    aliases: ['skimmed milk', 'fat free milk', 'double toned milk'],
    caloriesPer100g: 35,
    proteinPer100g: 3.4,
    carbsPer100g: 5.0,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 },
      { name: 'ml', weightG: 1 }
    ]
  },
  {
    id: 'curated-curd',
    name: 'Curd (Plain Dahi)',
    aliases: ['curd', 'dahi', 'yogurt', 'plain curd', 'plain dahi', 'dahi bowl'],
    caloriesPer100g: 63,
    proteinPer100g: 3.1,
    carbsPer100g: 4.4,
    fatPer100g: 3.5,
    servingSizes: [
      { name: 'cup', weightG: 200 },
      { name: 'bowl', weightG: 200 },
      { name: 'katori', weightG: 150 },
      { name: 'tbsp', weightG: 15 }
    ]
  },
  {
    id: 'curated-greek-yogurt',
    name: 'Greek Yogurt (Plain)',
    aliases: ['greek yogurt', 'plain greek yogurt'],
    caloriesPer100g: 80,
    proteinPer100g: 9.0,
    carbsPer100g: 3.6,
    fatPer100g: 3.2,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'container', weightG: 150 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-lassi-sweet',
    name: 'Lassi (Sweet)',
    aliases: ['lassi', 'sweet lassi', 'sweetened lassi'],
    caloriesPer100g: 75,
    proteinPer100g: 2.5,
    carbsPer100g: 12,
    fatPer100g: 2.0,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 }
    ]
  },
  {
    id: 'curated-lassi-mango',
    name: 'Mango Lassi',
    aliases: ['mango lassi'],
    caloriesPer100g: 85,
    proteinPer100g: 2.3,
    carbsPer100g: 14.5,
    fatPer100g: 2.1,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 }
    ]
  },
  {
    id: 'curated-buttermilk',
    name: 'Buttermilk (Chaas)',
    aliases: ['buttermilk', 'chaas', 'plain chaas', 'plain buttermilk'],
    caloriesPer100g: 30,
    proteinPer100g: 1.0,
    carbsPer100g: 2.5,
    fatPer100g: 0.8,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 }
    ]
  },
  {
    id: 'curated-masala-chaas',
    name: 'Masala Chaas',
    aliases: ['masala chaas', 'spiced buttermilk'],
    caloriesPer100g: 32,
    proteinPer100g: 1.1,
    carbsPer100g: 2.8,
    fatPer100g: 0.9,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'cup', weightG: 200 }
    ]
  },
  {
    id: 'curated-ghee',
    name: 'Ghee (Clarified Butter)',
    aliases: ['ghee', 'clarified butter', 'desi ghee'],
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    servingSizes: [
      { name: 'tbsp', weightG: 14 },
      { name: 'teaspoon', weightG: 5 },
      { name: 'tsp', weightG: 5 }
    ]
  },
  {
    id: 'curated-butter',
    name: 'Butter',
    aliases: ['butter', 'makkhan', 'salted butter', 'unsalted butter'],
    caloriesPer100g: 717,
    proteinPer100g: 0.85,
    carbsPer100g: 0.06,
    fatPer100g: 81,
    servingSizes: [
      { name: 'tbsp', weightG: 14 },
      { name: 'teaspoon', weightG: 5 },
      { name: 'tsp', weightG: 5 },
      { name: 'pat', weightG: 5 }
    ]
  },
  {
    id: 'curated-cheese',
    name: 'Cheese (Cheddar Processed)',
    aliases: ['cheese', 'cheese slice', 'cheese block', 'cheese cube'],
    caloriesPer100g: 350,
    proteinPer100g: 20,
    carbsPer100g: 2,
    fatPer100g: 28,
    servingSizes: [
      { name: 'slice', weightG: 21 },
      { name: 'cube', weightG: 25 },
      { name: 'piece', weightG: 25 }
    ]
  },

  // ─── Fitness & Breakfast Foods ──────────────────────────────────────────────
  {
    id: 'curated-whey-protein',
    name: 'Whey Protein Powder',
    aliases: ['whey', 'whey protein', 'protein powder', 'whey scoop', 'scoop of whey', 'scoop whey'],
    caloriesPer100g: 360,
    proteinPer100g: 80,
    carbsPer100g: 6,
    fatPer100g: 2.5,
    servingSizes: [
      { name: 'scoop', weightG: 30 },
      { name: 'serving', weightG: 30 },
      { name: 'piece', weightG: 30 }
    ]
  },
  {
    id: 'curated-oats-raw',
    name: 'Oats, Raw',
    aliases: ['oats', 'oatmeal', 'raw oats', 'oat'],
    caloriesPer100g: 389,
    proteinPer100g: 16.9,
    carbsPer100g: 66,
    fatPer100g: 6.9,
    servingSizes: [
      { name: 'cup', weightG: 40 },
      { name: 'serving', weightG: 40 },
      { name: 'bowl', weightG: 40 },
      { name: 'tbsp', weightG: 10 }
    ]
  },
  {
    id: 'curated-oats-cooked',
    name: 'Oats, Cooked (in Water)',
    aliases: ['cooked oats', 'cooked oatmeal'],
    caloriesPer100g: 71,
    proteinPer100g: 2.5,
    carbsPer100g: 12,
    fatPer100g: 1.4,
    servingSizes: [
      { name: 'cup', weightG: 234 },
      { name: 'bowl', weightG: 250 }
    ]
  },
  {
    id: 'curated-peanut-butter',
    name: 'Peanut Butter',
    aliases: ['peanut butter', 'peanutbutter'],
    caloriesPer100g: 588,
    proteinPer100g: 25,
    carbsPer100g: 20,
    fatPer100g: 50,
    servingSizes: [
      { name: 'tbsp', weightG: 16 },
      { name: 'tablespoon', weightG: 16 },
      { name: 'tsp', weightG: 5 },
      { name: 'teaspoon', weightG: 5 },
      { name: 'serving', weightG: 32 }
    ]
  },
  {
    id: 'curated-chia-seeds',
    name: 'Chia Seeds',
    aliases: ['chia seeds', 'chia seed'],
    caloriesPer100g: 486,
    proteinPer100g: 16.5,
    carbsPer100g: 42,
    fatPer100g: 30.7,
    servingSizes: [
      { name: 'tbsp', weightG: 12 },
      { name: 'tsp', weightG: 4 }
    ]
  },
  {
    id: 'curated-muesli',
    name: 'Muesli',
    aliases: ['muesli', 'mueslis'],
    caloriesPer100g: 380,
    proteinPer100g: 10,
    carbsPer100g: 68,
    fatPer100g: 6,
    servingSizes: [
      { name: 'cup', weightG: 45 },
      { name: 'bowl', weightG: 45 }
    ]
  },
  {
    id: 'curated-cornflakes',
    name: 'Cornflakes',
    aliases: ['cornflakes', 'corn flakes'],
    caloriesPer100g: 360,
    proteinPer100g: 7,
    carbsPer100g: 84,
    fatPer100g: 0.5,
    servingSizes: [
      { name: 'cup', weightG: 30 },
      { name: 'bowl', weightG: 30 }
    ]
  },
  {
    id: 'curated-sabudana-vada',
    name: 'Sabudana Vada',
    aliases: ['sabudana vada', 'sabudanavada'],
    caloriesPer100g: 310,
    proteinPer100g: 3,
    carbsPer100g: 48,
    fatPer100g: 12,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'vada', weightG: 50 }
    ]
  },

  // ─── Fruits ─────────────────────────────────────────────────────────────────
  {
    id: 'curated-mango',
    name: 'Mango',
    aliases: ['mango', 'mangoes', 'aam'],
    caloriesPer100g: 60,
    proteinPer100g: 0.8,
    carbsPer100g: 15,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 200 },
      { name: 'mango', weightG: 200 },
      { name: 'slice', weightG: 50 }
    ]
  },
  {
    id: 'curated-banana',
    name: 'Banana',
    aliases: ['banana', 'bananas', 'kela'],
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 118 },
      { name: 'banana', weightG: 118 },
      { name: 'medium', weightG: 118 },
      { name: 'large', weightG: 150 }
    ]
  },
  {
    id: 'curated-apple',
    name: 'Apple (with Skin)',
    aliases: ['apple', 'apples', 'seb'],
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 182 },
      { name: 'apple', weightG: 182 },
      { name: 'slice', weightG: 20 }
    ]
  },
  {
    id: 'curated-orange',
    name: 'Orange',
    aliases: ['orange', 'oranges', 'santra'],
    caloriesPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 12,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 131 },
      { name: 'orange', weightG: 131 }
    ]
  },
  {
    id: 'curated-papaya',
    name: 'Papaya',
    aliases: ['papaya', 'papayas', 'papita'],
    caloriesPer100g: 43,
    proteinPer100g: 0.5,
    carbsPer100g: 11,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'slice', weightG: 150 },
      { name: 'cup', weightG: 140 },
      { name: 'bowl', weightG: 140 }
    ]
  },
  {
    id: 'curated-watermelon',
    name: 'Watermelon',
    aliases: ['watermelon', 'watermelons', 'tarbooj'],
    caloriesPer100g: 30,
    proteinPer100g: 0.6,
    carbsPer100g: 8,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'slice', weightG: 280 },
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-muskmelon',
    name: 'Muskmelon',
    aliases: ['muskmelon', 'cantaloupe', 'kharbooja'],
    caloriesPer100g: 34,
    proteinPer100g: 0.8,
    carbsPer100g: 8,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 150 },
      { name: 'slice', weightG: 100 }
    ]
  },
  {
    id: 'curated-guava',
    name: 'Guava',
    aliases: ['guava', 'guavas', 'amrood'],
    caloriesPer100g: 68,
    proteinPer100g: 2.6,
    carbsPer100g: 14,
    fatPer100g: 1,
    servingSizes: [
      { name: 'piece', weightG: 100 },
      { name: 'guava', weightG: 100 }
    ]
  },
  {
    id: 'curated-grapes',
    name: 'Grapes',
    aliases: ['grapes', 'grape', 'angoor'],
    caloriesPer100g: 69,
    proteinPer100g: 0.7,
    carbsPer100g: 18,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 150 },
      { name: 'piece', weightG: 5 }
    ]
  },
  {
    id: 'curated-pomegranate',
    name: 'Pomegranate',
    aliases: ['pomegranate', 'pomegranates', 'anar'],
    caloriesPer100g: 83,
    proteinPer100g: 1.7,
    carbsPer100g: 19,
    fatPer100g: 1.2,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'anar', weightG: 150 },
      { name: 'cup', weightG: 150 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-pineapple',
    name: 'Pineapple',
    aliases: ['pineapple', 'pineapples', 'ananas'],
    caloriesPer100g: 50,
    proteinPer100g: 0.5,
    carbsPer100g: 13,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'slice', weightG: 80 },
      { name: 'cup', weightG: 165 }
    ]
  },
  {
    id: 'curated-chickoo',
    name: 'Chickoo (Sapodilla)',
    aliases: ['chickoo', 'sapodilla', 'sapota', 'chiku'],
    caloriesPer100g: 83,
    proteinPer100g: 0.4,
    carbsPer100g: 20,
    fatPer100g: 1.1,
    servingSizes: [
      { name: 'piece', weightG: 75 },
      { name: 'chickoo', weightG: 75 }
    ]
  },
  {
    id: 'curated-sweet-lime',
    name: 'Sweet Lime (Mosambi)',
    aliases: ['sweet lime', 'mosambi'],
    caloriesPer100g: 43,
    proteinPer100g: 0.8,
    carbsPer100g: 10.5,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 100 },
      { name: 'mosambi', weightG: 100 }
    ]
  },
  {
    id: 'curated-strawberry',
    name: 'Strawberry',
    aliases: ['strawberry', 'strawberries'],
    caloriesPer100g: 32,
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 12 },
      { name: 'cup', weightG: 150 }
    ]
  },
  {
    id: 'curated-pear',
    name: 'Pear',
    aliases: ['pear', 'pears', 'nashpati'],
    caloriesPer100g: 57,
    proteinPer100g: 0.4,
    carbsPer100g: 15,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 178 },
      { name: 'pear', weightG: 178 }
    ]
  },
  {
    id: 'curated-peach',
    name: 'Peach',
    aliases: ['peach', 'peaches'],
    caloriesPer100g: 39,
    proteinPer100g: 0.9,
    carbsPer100g: 9.5,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'peach', weightG: 150 }
    ]
  },
  {
    id: 'curated-plum',
    name: 'Plum',
    aliases: ['plum', 'plums', 'aloo bukhara'],
    caloriesPer100g: 46,
    proteinPer100g: 0.7,
    carbsPer100g: 11.4,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'piece', weightG: 65 },
      { name: 'plum', weightG: 65 }
    ]
  },
  {
    id: 'curated-dates',
    name: 'Dates (Dried)',
    aliases: ['date', 'dates', 'khajur', 'khajoor'],
    caloriesPer100g: 277,
    proteinPer100g: 1.8,
    carbsPer100g: 75,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 8 },
      { name: 'date', weightG: 8 }
    ]
  },
  {
    id: 'curated-almonds',
    name: 'Almonds',
    aliases: ['almond', 'almonds', 'badam'],
    caloriesPer100g: 579,
    proteinPer100g: 21,
    carbsPer100g: 22,
    fatPer100g: 50,
    servingSizes: [
      { name: 'piece', weightG: 1.2 },
      { name: 'almond', weightG: 1.2 }
    ]
  },
  {
    id: 'curated-walnuts',
    name: 'Walnuts',
    aliases: ['walnut', 'walnuts', 'akhrot'],
    caloriesPer100g: 654,
    proteinPer100g: 15,
    carbsPer100g: 14,
    fatPer100g: 65,
    servingSizes: [
      { name: 'piece', weightG: 4 },
      { name: 'walnut', weightG: 4 }
    ]
  },
  {
    id: 'curated-cashews',
    name: 'Cashews',
    aliases: ['cashew', 'cashews', 'kaju'],
    caloriesPer100g: 553,
    proteinPer100g: 18,
    carbsPer100g: 30,
    fatPer100g: 44,
    servingSizes: [
      { name: 'piece', weightG: 1.5 },
      { name: 'cashew', weightG: 1.5 }
    ]
  },
  {
    id: 'curated-pistachios',
    name: 'Pistachios',
    aliases: ['pistachio', 'pistachios', 'pista'],
    caloriesPer100g: 562,
    proteinPer100g: 20,
    carbsPer100g: 28,
    fatPer100g: 45,
    servingSizes: [
      { name: 'piece', weightG: 0.7 },
      { name: 'pistachio', weightG: 0.7 }
    ]
  },

  // ─── Vegetables (Raw / Cooked) ──────────────────────────────────────────────
  {
    id: 'curated-potato-boiled',
    name: 'Potato, Boiled',
    aliases: ['potato', 'potatoes', 'boiled potato', 'boiled potatoes', 'aloo'],
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'potato', weightG: 150 },
      { name: 'cup', weightG: 150 }
    ]
  },
  {
    id: 'curated-sweet-potato-boiled',
    name: 'Sweet Potato, Boiled',
    aliases: ['sweet potato', 'shakarkand', 'boiled sweet potato'],
    caloriesPer100g: 86,
    proteinPer100g: 1.6,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 150 },
      { name: 'potato', weightG: 150 }
    ]
  },
  {
    id: 'curated-tomato',
    name: 'Tomato',
    aliases: ['tomato', 'tomatoes', 'tamatar'],
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 120 },
      { name: 'tomato', weightG: 120 },
      { name: 'slice', weightG: 10 }
    ]
  },
  {
    id: 'curated-onion',
    name: 'Onion',
    aliases: ['onion', 'onions', 'pyaz', 'kanda'],
    caloriesPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 110 },
      { name: 'onion', weightG: 110 },
      { name: 'slice', weightG: 8 }
    ]
  },
  {
    id: 'curated-cucumber',
    name: 'Cucumber',
    aliases: ['cucumber', 'cucumbers', 'kheera', 'kakdi'],
    caloriesPer100g: 15,
    proteinPer100g: 0.7,
    carbsPer100g: 3.6,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'piece', weightG: 200 },
      { name: 'cucumber', weightG: 200 },
      { name: 'slice', weightG: 10 }
    ]
  },
  {
    id: 'curated-carrot',
    name: 'Carrot',
    aliases: ['carrot', 'carrots', 'gajar'],
    caloriesPer100g: 41,
    proteinPer100g: 0.9,
    carbsPer100g: 9.6,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'piece', weightG: 60 },
      { name: 'carrot', weightG: 60 },
      { name: 'cup', weightG: 120 }
    ]
  },
  {
    id: 'curated-broccoli',
    name: 'Broccoli (Cooked)',
    aliases: ['broccoli', 'cooked broccoli'],
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7,
    fatPer100g: 0.4,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'stalk', weightG: 150 }
    ]
  },
  {
    id: 'curated-cauliflower',
    name: 'Cauliflower (Cooked)',
    aliases: ['cauliflower', 'gobi', 'cooked cauliflower'],
    caloriesPer100g: 25,
    proteinPer100g: 1.9,
    carbsPer100g: 5,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'cup', weightG: 100 },
      { name: 'bowl', weightG: 120 }
    ]
  },
  {
    id: 'curated-cabbage',
    name: 'Cabbage (Cooked)',
    aliases: ['cabbage', 'patta gobi', 'cooked cabbage'],
    caloriesPer100g: 23,
    proteinPer100g: 1.3,
    carbsPer100g: 6,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'cup', weightG: 100 },
      { name: 'bowl', weightG: 120 }
    ]
  },
  {
    id: 'curated-green-peas',
    name: 'Green Peas (Boiled)',
    aliases: ['peas', 'green peas', 'matar', 'boiled peas'],
    caloriesPer100g: 81,
    proteinPer100g: 5.4,
    carbsPer100g: 14.5,
    fatPer100g: 0.4,
    servingSizes: [
      { name: 'cup', weightG: 160 },
      { name: 'bowl', weightG: 160 }
    ]
  },
  {
    id: 'curated-spinach-cooked',
    name: 'Spinach (Cooked)',
    aliases: ['spinach', 'palak', 'cooked spinach', 'cooked palak'],
    caloriesPer100g: 23,
    proteinPer100g: 3.0,
    carbsPer100g: 4.0,
    fatPer100g: 0.3,
    servingSizes: [
      { name: 'cup', weightG: 180 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-mushroom-cooked',
    name: 'Mushrooms (Cooked)',
    aliases: ['mushroom', 'mushrooms', 'cooked mushroom', 'cooked mushrooms'],
    caloriesPer100g: 28,
    proteinPer100g: 2.2,
    carbsPer100g: 4.5,
    fatPer100g: 0.5,
    servingSizes: [
      { name: 'cup', weightG: 140 },
      { name: 'bowl', weightG: 140 }
    ]
  },

  // ─── Beverages ──────────────────────────────────────────────────────────────
  {
    id: 'curated-tea',
    name: 'Chai (Indian Tea with Milk & Sugar)',
    aliases: ['chai', 'tea', 'milk tea', 'cutting chai'],
    caloriesPer100g: 50,
    proteinPer100g: 1.2,
    carbsPer100g: 8.5,
    fatPer100g: 1.4,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'glass', weightG: 150 },
      { name: 'cutting', weightG: 90 }
    ]
  },
  {
    id: 'curated-coffee',
    name: 'Coffee (with Milk & Sugar)',
    aliases: ['coffee', 'milk coffee', 'nescafe'],
    caloriesPer100g: 55,
    proteinPer100g: 1.4,
    carbsPer100g: 9.2,
    fatPer100g: 1.5,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'glass', weightG: 200 }
    ]
  },
  {
    id: 'curated-black-coffee',
    name: 'Black Coffee',
    aliases: ['black coffee', 'americano', 'espresso'],
    caloriesPer100g: 2,
    proteinPer100g: 0.1,
    carbsPer100g: 0,
    fatPer100g: 0,
    servingSizes: [
      { name: 'cup', weightG: 150 },
      { name: 'glass', weightG: 200 }
    ]
  },
  {
    id: 'curated-green-tea',
    name: 'Green Tea',
    aliases: ['green tea', 'herbal tea'],
    caloriesPer100g: 1,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    servingSizes: [
      { name: 'cup', weightG: 150 }
    ]
  },
  {
    id: 'curated-coconut-water',
    name: 'Coconut Water',
    aliases: ['coconut water', 'nariyal paani', 'coconut juice'],
    caloriesPer100g: 19,
    proteinPer100g: 0.7,
    carbsPer100g: 3.7,
    fatPer100g: 0.2,
    servingSizes: [
      { name: 'glass', weightG: 250 },
      { name: 'coconut', weightG: 300 }
    ]
  },
  {
    id: 'curated-diet-coke',
    name: 'Diet Coke / Coke Zero',
    aliases: ['diet coke', 'coke zero', 'diet pepsi', 'pepsi black'],
    caloriesPer100g: 0.3,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    servingSizes: [
      { name: 'can', weightG: 330 },
      { name: 'glass', weightG: 250 },
      { name: 'bottle', weightG: 500 }
    ]
  },
  {
    id: 'curated-sugarcane-juice',
    name: 'Sugarcane Juice',
    aliases: ['sugarcane juice', 'ganne ka juice'],
    caloriesPer100g: 80,
    proteinPer100g: 0.2,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    servingSizes: [
      { name: 'glass', weightG: 250 }
    ]
  },

  // ─── Sweets & Desserts ──────────────────────────────────────────────────────
  {
    id: 'curated-gulab-jamun',
    name: 'Gulab Jamun',
    aliases: ['gulab jamun', 'gulabjamun'],
    caloriesPer100g: 380,
    proteinPer100g: 4.8,
    carbsPer100g: 62,
    fatPer100g: 13,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'serving', weightG: 100 }
    ]
  },
  {
    id: 'curated-kaju-katli',
    name: 'Kaju Katli',
    aliases: ['kaju katli', 'kaju barfi'],
    caloriesPer100g: 400,
    proteinPer100g: 8.8,
    carbsPer100g: 58,
    fatPer100g: 16.5,
    servingSizes: [
      { name: 'piece', weightG: 15 },
      { name: 'barfi', weightG: 15 }
    ]
  },
  {
    id: 'curated-rasgulla',
    name: 'Rasgulla',
    aliases: ['rasgulla', 'roshogolla'],
    caloriesPer100g: 186,
    proteinPer100g: 4,
    carbsPer100g: 40,
    fatPer100g: 1.8,
    servingSizes: [
      { name: 'piece', weightG: 50 },
      { name: 'rasgulla', weightG: 50 }
    ]
  },
  {
    id: 'curated-jalebi',
    name: 'Jalebi',
    aliases: ['jalebi', 'jalebis'],
    caloriesPer100g: 300,
    proteinPer100g: 2.5,
    carbsPer100g: 70,
    fatPer100g: 2.2,
    servingSizes: [
      { name: 'piece', weightG: 25 },
      { name: 'plate', weightG: 100 }
    ]
  },
  {
    id: 'curated-icecream-vanilla',
    name: 'Vanilla Ice Cream',
    aliases: ['vanilla ice cream', 'ice cream', 'vanilla icecream'],
    caloriesPer100g: 207,
    proteinPer100g: 3.5,
    carbsPer100g: 24,
    fatPer100g: 11,
    servingSizes: [
      { name: 'scoop', weightG: 75 },
      { name: 'cup', weightG: 100 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-icecream-chocolate',
    name: 'Chocolate Ice Cream',
    aliases: ['chocolate ice cream', 'chocolate icecream'],
    caloriesPer100g: 216,
    proteinPer100g: 3.8,
    carbsPer100g: 25,
    fatPer100g: 11,
    servingSizes: [
      { name: 'scoop', weightG: 75 },
      { name: 'cup', weightG: 100 },
      { name: 'bowl', weightG: 150 }
    ]
  },
  {
    id: 'curated-dark-chocolate',
    name: 'Dark Chocolate (85%)',
    aliases: ['dark chocolate', 'cocoa chocolate'],
    caloriesPer100g: 598,
    proteinPer100g: 7.8,
    carbsPer100g: 45,
    fatPer100g: 46,
    servingSizes: [
      { name: 'piece', weightG: 10 },
      { name: 'bar', weightG: 100 }
    ]
  },

  // ─── Savories & Snacks ──────────────────────────────────────────────────────
  {
    id: 'curated-masala-oats',
    name: 'Saffola Masala Oats',
    aliases: ['masala oats', 'saffola oats'],
    caloriesPer100g: 390,
    proteinPer100g: 10.5,
    carbsPer100g: 66,
    fatPer100g: 7.5,
    servingSizes: [
      { name: 'serving', weightG: 38 },
      { name: 'pack', weightG: 38 },
      { name: 'bowl', weightG: 38 }
    ]
  },
  {
    id: 'curated-roasted-chana',
    name: 'Roasted Chana (Bengal Gram)',
    aliases: ['roasted chana', 'bhuna chana', 'chana snack'],
    caloriesPer100g: 360,
    proteinPer100g: 22.5,
    carbsPer100g: 58,
    fatPer100g: 5.2,
    servingSizes: [
      { name: 'handful', weightG: 25 },
      { name: 'cup', weightG: 50 },
      { name: 'tbsp', weightG: 10 }
    ]
  },
  {
    id: 'curated-peanuts-roasted',
    name: 'Roasted Peanuts',
    aliases: ['peanuts', 'roasted peanuts', 'shengdana', 'singdana'],
    caloriesPer100g: 567,
    proteinPer100g: 25.8,
    carbsPer100g: 16.1,
    fatPer100g: 49.2,
    servingSizes: [
      { name: 'handful', weightG: 25 },
      { name: 'cup', weightG: 140 },
      { name: 'piece', weightG: 1 }
    ]
  },
  {
    id: 'curated-mixed-seeds',
    name: 'Mixed Seeds (Pumpkin/Sunflower/Flax)',
    aliases: ['mixed seeds', 'seeds mix', 'health seeds'],
    caloriesPer100g: 550,
    proteinPer100g: 20,
    carbsPer100g: 28,
    fatPer100g: 45,
    servingSizes: [
      { name: 'tbsp', weightG: 12 },
      { name: 'teaspoon', weightG: 5 },
      { name: 'tsp', weightG: 5 }
    ]
  }
]
