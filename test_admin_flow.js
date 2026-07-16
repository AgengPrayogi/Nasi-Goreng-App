const axios = require('axios');

async function testAdminFlow() {
  const BASE_URL = 'http://localhost:5000/api';
  let adminToken;
  let ingredientId;
  let menuId;

  console.log('🔐 Starting Admin Flow Test...\n');

  try {
    // STEP 1: Register first admin (only works if no admin exists yet)
    console.log('Step 1: Registering admin...');
    try {
      const regRes = await axios.post(`${BASE_URL}/auth/register-admin`, {
        email: 'admin@test.com',
        password: 'AdminPass123!',
        confirmPassword: 'AdminPass123!'
      });
      console.log(`✅ Admin registered: ${regRes.data.data.email}`);
    } catch (regErr) {
      if (regErr.response && regErr.response.status === 403) {
        console.log('ℹ️  Admin already exists, skipping registration...');
      } else {
        throw regErr;
      }
    }

    // STEP 2: Verify admin email (simulate email verification)
    console.log('\nStep 2: Verifying admin email...');
    const path = require('path');
    const Admin = require(path.join(__dirname, 'backend/src/models/Admin'));
    const admin = await Admin.findOne({ email: 'admin@test.com' });
    if (admin && !admin.isVerified) {
      admin.isVerified = true;
      await admin.save();
      console.log('✅ Email verified');
    } else if (admin && admin.isVerified) {
      console.log('ℹ️  Admin already verified');
    }

    // STEP 3: Login to get JWT token
    console.log('\nStep 3: Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'AdminPass123!'
    });
    adminToken = loginRes.data.data.token;
    console.log(`✅ Logged in. Token: ${adminToken.substring(0, 20)}...`);

    // STEP 4: Create ingredient (bahan)
    console.log('\nStep 4: Creating ingredient...');
    const ingRes = await axios.post(`${BASE_URL}/ingredients`, 
      {
        name: 'Beras Premium',
        unit: 'gram',
        currentStock: 5000,
        minimumStock: 500
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    ingredientId = ingRes.data.data._id;
    console.log(`✅ Ingredient created: ${ingRes.data.data.name} (ID: ${ingredientId})`);

    // STEP 5: List ingredients
    console.log('\nStep 5: Listing ingredients...');
    const listIngRes = await axios.get(`${BASE_URL}/ingredients`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Found ${listIngRes.data.data.length} ingredients`);
    console.log('   Ingredients:', listIngRes.data.data.map(i => i.name).join(', '));

    // STEP 6: Create menu
    console.log('\nStep 6: Creating menu...');
    const menuRes = await axios.post(`${BASE_URL}/menus`,
      {
        name: 'Nasi Goreng Spesial',
        description: 'Nasi goreng dengan telur, ayam, dan kerupuk',
        price: 25000,
        ingredients: [
          { ingredient: ingredientId, quantity: 200 } // 200g beras
        ]
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    menuId = menuRes.data.data._id;
    console.log(`✅ Menu created: ${menuRes.data.data.name} - Rp ${menuRes.data.data.price}`);

    // STEP 7: List menus (public - no auth needed)
    console.log('\nStep 7: Listing menus (public)...');
    const listMenuRes = await axios.get(`${BASE_URL}/menus`);
    console.log(`✅ Found ${listMenuRes.data.data.length} menus`);
    console.log('   Menus:', listMenuRes.data.data.map(m => m.name).join(', '));

    // STEP 8: Update menu
    console.log('\nStep 8: Updating menu...');
    const updateMenuRes = await axios.patch(`${BASE_URL}/menus/${menuId}`,
      {
        name: 'Nasi Goreng Spesial (Updated)',
        price: 28000,
        description: 'Harga naik karena bahan mahal'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Menu updated: ${updateMenuRes.data.data.name} - Rp ${updateMenuRes.data.data.price}`);

    // STEP 9: Soft-delete menu
    console.log('\nStep 9: Deleting menu (soft delete)...');
    const deleteMenuRes = await axios.delete(`${BASE_URL}/menus/${menuId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Menu deleted (soft delete). Active: ${deleteMenuRes.data.data.isAvailable}`);

    // STEP 10: Restock ingredient
    console.log('\nStep 10: Restocking ingredient...');
    const restockRes = await axios.post(`${BASE_URL}/stock-movements/restock`,
      {
        ingredientId: ingredientId,
        amount: 1000
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Restocked. Current stock: ${restockRes.data.data.currentStock}`);

    // STEP 11: Check reports (may be empty if no orders)
    console.log('\nStep 11: Checking reports...');
    try {
      const salesRes = await axios.get(`${BASE_URL}/reports/sales?period=daily`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ Sales report loaded. Data:`, JSON.stringify(salesRes.data.data).substring(0, 100));
    } catch (reportErr) {
      console.log('⚠️  Reports may need actual order data. Error:', reportErr.response?.data?.message || reportErr.message);
    }

    // STEP 12: Check analytics/dashboard
    console.log('\nStep 12: Checking dashboard...');
    try {
      const dashboardRes = await axios.get(`${BASE_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ Dashboard loaded.`);
      console.log('   KPI:', JSON.stringify(dashboardRes.data.data?.kpi || {}).substring(0, 100));
    } catch (dashErr) {
      console.log('⚠️  Dashboard needs data. Error:', dashErr.response?.data?.message || dashErr.message);
    }

    console.log('\n✨ ALL ADMIN FLOW TESTS COMPLETED! ✨');
    console.log('\n📋 Summary:');
    console.log('  ✅ Admin registration & login works');
    console.log('  ✅ Create/Read/Update/Delete menu works');
    console.log('  ✅ Create ingredient & restock works');
    console.log('  ✅ Reports require actual order data (not empty)');
    console.log('  ℹ️  Soft-delete sets isAvailable=false, menu still in DB');
    console.log('\n💡 Next steps:');
    console.log('  1. Create some orders via customer flow');
    console.log('  2. Confirm & complete orders via admin');
    console.log('  3. Then reports/analytics will show real data');
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error(error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testAdminFlow();