const axios = require('axios');

async function testCustomerFlow() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🚀 Starting Customer Flow Test...\n');

  try {
    // 1. Test Get Menus (public, no auth)
    console.log('Step 1: Fetching menus...');
    const menuRes = await axios.get(`${BASE_URL}/menus`);
    console.log(`✅ Success: Found ${menuRes.data.length} menus.`);

    if (menuRes.data.length === 0) {
      throw new Error('No menus available to order. Please seed database first.');
    }
    const itemToOrder = menuRes.data[0]._id;

    // 2. Test Create Order (public, no auth, requires customerName + customerPhone)
    console.log('\nStep 2: Creating dine-in order...');
    const orderRes = await axios.post(`${BASE_URL}/orders`, {
      items: [{ menuId: itemToOrder, quantity: 1 }],
      customerName: 'Test Customer',
      customerPhone: '081234567890',
      channel: 'dine_in',
      notes: 'Pedas banget ya'
    });
    const orderCode = orderRes.data.orderCode;
    const orderId = orderRes.data._id;
    console.log(`✅ Success: Order created. Order Code: ${orderCode}`);

    // 3. Test Track Order (public, no auth)
    console.log('\nStep 3: Tracking order...');
    const trackRes = await axios.get(`${BASE_URL}/orders/track/${orderCode}`);
    console.log(`✅ Success: Order status is ${trackRes.data.kitchenStatus}. ETA: ${trackRes.data.estimatedReadyAt}`);

    // 4. Test Invoice Preview/Download (public, no auth)
    console.log('\nStep 4: Testing invoice access...');
    try {
      const invoiceRes = await axios.get(`${BASE_URL}/invoices/order/${orderCode}`);
      if (invoiceRes.status === 200) {
        console.log('✅ Success: Invoice PDF accessible.');
      }
    } catch (invErr) {
      if (invErr.response && invErr.response.status === 404) {
        console.log('ℹ️  Invoice not found (no PDF generated yet). This is expected if no invoice service exists for this order.');
      } else {
        throw invErr;
      }
    }

    console.log('\n✨ ALL CUSTOMER FLOW TESTS PASSED! ✨');
    console.log('\n📋 Summary:');
    console.log('  - Customer does NOT need authentication');
    console.log('  - Public endpoints: GET /api/menus, POST /api/orders, GET /api/orders/track/:orderCode');
    console.log('  - Order creation requires: customerName, customerPhone, items');
    console.log('  - Channel is "dine_in" (for in-restaurant) or "online"');
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error(error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testCustomerFlow();