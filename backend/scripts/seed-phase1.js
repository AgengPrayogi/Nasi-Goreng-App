/**
 * Seed script for Phase 1 development testing
 * Usage: MONGODB_URI="..." node scripts/seed-phase1.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const Staff = require('../src/models/Staff');
const Customer = require('../src/models/Customer');
const Supplier = require('../src/models/Supplier');
const Promotion = require('../src/models/Promotion');
const PromoCode = require('../src/models/PromoCode');

async function seedData() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing seed data
    console.log('Clearing existing data...');
    await Promise.all([
      Staff.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
      Promotion.deleteMany({}),
      PromoCode.deleteMany({})
    ]);

    // Seed Staff
    console.log('Seeding staff...');
    const staffData = [
      {
        email: 'admin@nasigoreng.local',
        password: 'Admin@123456',
        name: 'Admin Utama',
        phone: '08123456789',
        role: 'admin',
        status: 'active'
      },
      {
        email: 'kasir1@nasigoreng.local',
        password: 'Kasir@123456',
        name: 'Budi Kasir',
        phone: '08111111111',
        role: 'cashier',
        status: 'active'
      },
      {
        email: 'chef1@nasigoreng.local',
        password: 'Chef@123456',
        name: 'Chef Siti',
        phone: '08222222222',
        role: 'chef',
        status: 'active'
      },
      {
        email: 'manager1@nasigoreng.local',
        password: 'Manager@123456',
        name: 'Manajer Toko',
        phone: '08333333333',
        role: 'manager',
        status: 'active'
      },
      {
        email: 'waiter1@nasigoreng.local',
        password: 'Waiter@123456',
        name: 'Waiter Andi',
        phone: '08444444444',
        role: 'waiter',
        status: 'active'
      }
    ];

    const staff = await Promise.all(
      staffData.map(async (s) => {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(s.password, salt);
        return Staff.create({
          email: s.email,
          passwordHash,
          name: s.name,
          phone: s.phone,
          role: s.role,
          status: s.status,
          isActive: true
        });
      })
    );
    console.log(`✓ Created ${staff.length} staff members`);

    // Seed Customers
    console.log('Seeding customers...');
    const customerData = [
      { phone: '082122334455', name: 'Pelanggan Setia', email: 'setia@email.com', totalOrders: 25, totalSpent: 500000 },
      { phone: '082155667788', name: 'Reguler Mingguan', email: 'reguler@email.com', totalOrders: 12, totalSpent: 200000 },
      { phone: '082188990011', name: 'Sesekali', email: 'sesekali@email.com', totalOrders: 3, totalSpent: 60000 },
      { phone: '082111223344', name: 'Baru Hari Ini', email: 'baru@email.com', totalOrders: 1, totalSpent: 25000 },
      { phone: '082144556677', name: 'VIP Customer', email: 'vip@email.com', totalOrders: 50, totalSpent: 1000000 }
    ];

    const customers = await Promise.all(
      customerData.map(async (c) => {
        const customer = await Customer.create({
          phone: c.phone,
          name: c.name,
          email: c.email,
          totalOrders: c.totalOrders,
          totalSpent: c.totalSpent,
          tier: c.totalOrders >= 20 ? 'gold' : c.totalOrders >= 5 ? 'silver' : 'bronze',
          lastOrderDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          isActive: true
        });
        return customer;
      })
    );
    console.log(`✓ Created ${customers.length} customers`);

    // Seed Suppliers
    console.log('Seeding suppliers...');
    const supplierData = [
      {
        name: 'PT Supplier Bahan Utama',
        contact: 'Budi Supplier',
        email: 'supplier1@email.com',
        phone: '021-5555-1234',
        address: 'Jl. Supplier No 1, Jakarta',
        leadTime: 2,
        paymentTerms: 'NET 30'
      },
      {
        name: 'UD Bahan Segar Harian',
        contact: 'Siti Bahan',
        email: 'bahan@email.com',
        phone: '021-6666-5678',
        address: 'Jl. Pasar Bahan, Jakarta',
        leadTime: 1,
        paymentTerms: 'COD'
      }
    ];

    const suppliers = await Promise.all(
      supplierData.map((s) => Supplier.create(s))
    );
    console.log(`✓ Created ${suppliers.length} suppliers`);

    // Seed Promotions
    console.log('Seeding promotions...');
    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const promotionData = [
      {
        name: 'Diskon Persentase 20%',
        description: 'Diskon 20% untuk semua menu',
        type: 'percentage',
        discountValue: 20,
        applicableTo: 'all',
        minimumOrderValue: 50000,
        validFrom: now,
        validTo: nextMonth,
        isActive: true
      },
      {
        name: 'Diskon Tetap Rp 50000',
        description: 'Diskon tetap 50rb untuk minimal order 100rb',
        type: 'fixed',
        discountValue: 50000,
        applicableTo: 'all',
        minimumOrderValue: 100000,
        maximumDiscount: 50000,
        validFrom: now,
        validTo: nextMonth,
        isActive: true
      }
    ];

    const promotions = await Promise.all(
      promotionData.map((p) => Promotion.create(p))
    );
    console.log(`✓ Created ${promotions.length} promotions`);

    // Generate Promo Codes
    console.log('Generating promo codes...');
    const promoCodes = [];
    for (const promo of promotions) {
      for (let i = 0; i < 5; i++) {
        const code = `${promo.name.substring(0, 3).toUpperCase()}${i + 1}`;
        const promoCode = await PromoCode.create({
          code,
          promotionId: promo._id,
          maxUse: -1,
          validFrom: promo.validFrom,
          validTo: promo.validTo,
          isActive: true
        });
        promoCodes.push(promoCode);
      }
    }
    console.log(`✓ Created ${promoCodes.length} promo codes`);

    // Print summary
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • Staff: ${staff.length}`);
    console.log(`  • Customers: ${customers.length}`);
    console.log(`  • Suppliers: ${suppliers.length}`);
    console.log(`  • Promotions: ${promotions.length}`);
    console.log(`  • Promo Codes: ${promoCodes.length}`);

    console.log('\n🔐 Test Credentials:');
    console.log('  Admin:   admin@nasigoreng.local / Admin@123456');
    console.log('  Kasir:   kasir1@nasigoreng.local / Kasir@123456');
    console.log('  Chef:    chef1@nasigoreng.local / Chef@123456');

    console.log('\n💰 Promo Codes:');
    promoCodes.slice(0, 5).forEach((code) => {
      console.log(`  • ${code.code}`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();
