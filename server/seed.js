require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
const ActivityLog = require('./models/ActivityLog');

// Use reliable public DNS resolvers to prevent querySrv ECONNREFUSED on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers, using system default:', dnsErr.message);
}

/**
 * Mask sensitive credentials in MongoDB URI for safe logging
 */
function sanitizeUri(uri) {
  if (!uri) return '';
  return uri.replace(/:([^:@]+)@/, ':****@');
}

/**
 * Attempt to connect to a MongoDB instance with timeout
 */
async function tryConnect(uri, label = 'Primary') {
  if (!uri) return false;
  const cleanUri = uri.trim();
  console.log(`📡 [${label}] Connecting to MongoDB: ${sanitizeUri(cleanUri)}...`);

  try {
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ [${label}] Connected successfully to MongoDB.`);
    return true;
  } catch (err) {
    console.error(`❌ [${label}] Connection failed:`);
    console.error(`   Message: ${err.message}`);
    if (err.code) console.error(`   Error Code: ${err.code}`);
    if (err.syscall) console.error(`   Syscall: ${err.syscall}`);
    if (err.hostname) console.error(`   Hostname: ${err.hostname}`);

    // Provide specific diagnostic hints
    if (err.syscall === 'querySrv' || err.code === 'ECONNREFUSED' || (err.message && err.message.includes('querySrv'))) {
      console.warn('   💡 Hint: DNS SRV resolution failed. Your local network/ISP or VPN might be blocking SRV lookups on port 53.');
    } else if (err.message && (err.message.includes('bad auth') || err.message.includes('Authentication failed'))) {
      console.warn('   💡 Hint: MongoDB Atlas authentication failed. Please verify the database username and password in server/.env.');
    } else if (err.name === 'MongooseServerSelectionError') {
      console.warn('   💡 Hint: Server selection timed out. Please ensure your current IP address is whitelisted in MongoDB Atlas (Network Access -> Allow Access from Anywhere / 0.0.0.0/0).');
    }

    return false;
  }
}

async function seedDatabase() {
  const primaryUri = (process.env.MONGO_URI || '').trim();
  const fallbackUri = (process.env.MONGO_FALLBACK_URI || 'mongodb://127.0.0.1:27017/smart_expense_splitter').trim();

  let connected = false;

  // 1. Attempt Primary connection
  if (primaryUri) {
    connected = await tryConnect(primaryUri, 'Primary');
  }

  // 2. Attempt Fallback connection if primary failed and fallback is different
  if (!connected && fallbackUri && fallbackUri !== primaryUri) {
    console.log('\n🔄 Attempting fallback MongoDB connection...');
    connected = await tryConnect(fallbackUri, 'Fallback (Local)');
  }

  // 3. Graceful bypass if both fail
  if (!connected) {
    console.log('\n======================================================');
    console.log('⚠️  DATABASE SEEDING BYPASS NOTICE');
    console.log('======================================================');
    console.log('Could not connect to MongoDB Atlas or local MongoDB.');
    console.log('The application code, models, and frontend are ready.');
    console.log('\nTo enable database persistence and re-run seeding:');
    console.log(' 1. In MongoDB Atlas: Check Database Access (username/password)');
    console.log(' 2. In MongoDB Atlas: Ensure Network Access has 0.0.0.0/0 added');
    console.log(' 3. Or start a local MongoDB instance: mongodb://127.0.0.1:27017');
    console.log(' 4. Once connected, run: npm run seed');
    console.log('======================================================\n');
    process.exit(0);
  }

  // Connected! Proceed with seeding
  try {
    console.log('\n🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Expense.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    console.log('👥 Creating Demo Users...');
    const alice = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password123',
    });

    const bob = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'password123',
    });

    const charlie = await User.create({
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      password: 'password123',
    });

    const diana = await User.create({
      name: 'Diana Prince',
      email: 'diana@example.com',
      password: 'password123',
    });

    console.log('✨ Creating Demo Groups...');
    // Group 1: Northern Trip (PKR)
    const tripGroup = await Group.create({
      name: 'Hunza Valley Road Trip',
      description: 'Trip fuel, hotel bookings, jeep rentals, and barbecues',
      defaultCurrency: 'PKR',
      icon: '🚗',
      createdBy: alice._id,
      members: [alice._id, bob._id, charlie._id, diana._id],
    });

    // Group 2: Apartment 402 Bills (USD)
    const apartmentGroup = await Group.create({
      name: 'Apartment 402 Shared Bills',
      description: 'Monthly groceries, gigabit wifi, electricity & maintenance',
      defaultCurrency: 'USD',
      icon: '🏠',
      createdBy: bob._id,
      members: [alice._id, bob._id, charlie._id],
    });

    console.log('💸 Adding Demo Expenses...');
    // Expense 1: Jeep rental in Hunza paid by Alice (PKR 12,000 split equally)
    await Expense.create({
      group: tripGroup._id,
      description: 'Jeep Safari to Attabad Lake',
      totalAmount: 12000,
      currency: 'PKR',
      paidBy: alice._id,
      category: 'Transportation',
      splitType: 'equal',
      splitBetween: [
        { user: alice._id, amount: 3000 },
        { user: bob._id, amount: 3000 },
        { user: charlie._id, amount: 3000 },
        { user: diana._id, amount: 3000 },
      ],
    });

    // Expense 2: Hotel booking in Hunza paid by Bob (PKR 24,000 split equally)
    await Expense.create({
      group: tripGroup._id,
      description: 'Hotel Serena Gilgit Stay (2 Nights)',
      totalAmount: 24000,
      currency: 'PKR',
      paidBy: bob._id,
      category: 'Rent',
      splitType: 'equal',
      splitBetween: [
        { user: alice._id, amount: 6000 },
        { user: bob._id, amount: 6000 },
        { user: charlie._id, amount: 6000 },
        { user: diana._id, amount: 6000 },
      ],
    });

    // Expense 3: Barbecue dinner paid by Charlie (PKR 8,000 split equally)
    await Expense.create({
      group: tripGroup._id,
      description: 'Rooftop Trout BBQ & Dinner',
      totalAmount: 8000,
      currency: 'PKR',
      paidBy: charlie._id,
      category: 'Food & Drink',
      splitType: 'equal',
      splitBetween: [
        { user: alice._id, amount: 2000 },
        { user: bob._id, amount: 2000 },
        { user: charlie._id, amount: 2000 },
        { user: diana._id, amount: 2000 },
      ],
    });

    // Expense 4: Apartment High-Speed Internet paid by Bob (USD 90)
    await Expense.create({
      group: apartmentGroup._id,
      description: 'Fibre Optic Gigabit Internet',
      totalAmount: 90,
      currency: 'USD',
      paidBy: bob._id,
      category: 'Utilities',
      splitType: 'equal',
      splitBetween: [
        { user: alice._id, amount: 30 },
        { user: bob._id, amount: 30 },
        { user: charlie._id, amount: 30 },
      ],
    });

    console.log('📝 Creating Audit Feed Activities...');
    await ActivityLog.create([
      {
        group: tripGroup._id,
        performedBy: alice._id,
        action: 'created group',
        details: 'Alice Johnson created the group "Hunza Valley Road Trip"',
      },
      {
        group: tripGroup._id,
        performedBy: alice._id,
        action: 'added expense',
        details: 'Alice Johnson added expense "Jeep Safari to Attabad Lake" for PKR 12,000.00',
      },
      {
        group: tripGroup._id,
        performedBy: bob._id,
        action: 'added expense',
        details: 'Bob Smith added expense "Hotel Serena Gilgit Stay (2 Nights)" for PKR 24,000.00',
      },
      {
        group: tripGroup._id,
        performedBy: charlie._id,
        action: 'added expense',
        details: 'Charlie Davis added expense "Rooftop Trout BBQ & Dinner" for PKR 8,000.00',
      },
      {
        group: apartmentGroup._id,
        performedBy: bob._id,
        action: 'created group',
        details: 'Bob Smith created the group "Apartment 402 Shared Bills"',
      },
      {
        group: apartmentGroup._id,
        performedBy: bob._id,
        action: 'added expense',
        details: 'Bob Smith added expense "Fibre Optic Gigabit Internet" for USD 90.00',
      },
    ]);

    console.log('\n=========================================');
    console.log('🎉 Database seeded successfully!');
    console.log('=========================================');
    console.log('Login credentials for testing:');
    console.log('  Email:    alice@example.com');
    console.log('  Password: password123');
    console.log('-----------------------------------------');
    console.log('  Email:    bob@example.com');
    console.log('  Password: password123');
    console.log('-----------------------------------------');
    console.log('  Email:    charlie@example.com');
    console.log('  Password: password123');
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding process error:', err);
    process.exit(1);
  }
}

seedDatabase();
