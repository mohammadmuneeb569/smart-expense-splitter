require('dotenv').config();
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Use reliable public DNS resolvers to prevent querySrv ECONNREFUSED on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers, using system default:', dnsErr.message);
}

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const activityRoutes = require('./routes/activities');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', settlementRoutes);
app.use('/api/groups', activityRoutes);

// Health check with database connection status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

function sanitizeUri(uri) {
  if (!uri) return '';
  return uri.replace(/:([^:@]+)@/, ':****@');
}

/**
 * Connect to MongoDB with timeout and fallback handling
 */
async function connectWithFallback() {
  const primaryUri = (process.env.MONGO_URI || '').trim();
  const fallbackUri = (process.env.MONGO_FALLBACK_URI || 'mongodb://127.0.0.1:27017/smart_expense_splitter').trim();

  // Try primary
  if (primaryUri) {
    try {
      console.log(`📡 Connecting to MongoDB (Primary): ${sanitizeUri(primaryUri)}...`);
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ MongoDB connected successfully to Primary instance');
      return true;
    } catch (err) {
      console.error('❌ Primary MongoDB connection failed:');
      console.error(`   Message: ${err.message}`);
      if (err.code) console.error(`   Error Code: ${err.code}`);
      if (err.syscall) console.error(`   Syscall: ${err.syscall}`);

      if (err.syscall === 'querySrv' || err.code === 'ECONNREFUSED') {
        console.warn('   💡 Hint: DNS SRV resolution issue on local network.');
      } else if (err.message && err.message.includes('bad auth')) {
        console.warn('   💡 Hint: MongoDB Atlas authentication failed. Check credentials in server/.env.');
      }
    }
  }

  // Try fallback if primary failed
  if (fallbackUri && fallbackUri !== primaryUri) {
    try {
      console.log(`\n🔄 Attempting fallback connection: ${sanitizeUri(fallbackUri)}...`);
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
      console.log('✅ Connected to Fallback MongoDB successfully!');
      return true;
    } catch (fallbackErr) {
      console.error(`❌ Fallback MongoDB connection failed: ${fallbackErr.message}`);
    }
  }

  console.warn('\n⚠️  MongoDB is currently unreachable. The server will start, but database operations will wait or return an error until connection is established.');
  return false;
}

const PORT = process.env.PORT || 5000;

// Start server
connectWithFallback().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
module.exports = app;