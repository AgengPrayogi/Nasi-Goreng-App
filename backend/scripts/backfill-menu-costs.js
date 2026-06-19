/**
 * One-time Phase 2 BI migration for menu cost fields (safe to run multiple times).
 * Usage: MONGODB_URI=... node scripts/backfill-menu-costs.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Menu = require('../src/models/Menu');
const { calculateIngredientCost, applyMenuCostMetrics } = require('../src/services/menuService');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const menus = await Menu.find();
  let updated = 0;

  for (const menu of menus) {
    menu.costPrice = await calculateIngredientCost(menu.ingredients || []);
    applyMenuCostMetrics(menu);
    await menu.save();
    updated += 1;
  }

  console.log('Menus recalculated:', updated);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
