#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testSignup = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Create a test user
    const testEmail = `debug${Date.now()}@test.local`;
    console.log(`📧 Creating test user: ${testEmail}`);
    
    const newUser = new User({
      firstName: 'Debug',
      lastName: 'User',
      email: testEmail,
      passwordHash: 'TestPassword123!',
      isVerified: true,
      extensionEnabled: true
    });

    console.log('💾 Attempting to save user...');
    await newUser.save();
    console.log('✅ User saved successfully!');
    console.log(`   User ID: ${newUser._id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.firstName} ${newUser.lastName}`);
    
    // Test 2: Verify user is in database
    console.log('\n🔍 Verifying user in database...');
    const savedUser = await User.findOne({ email: testEmail });
    if (savedUser) {
      console.log('✅ User found in database!');
      console.log(`   ID: ${savedUser._id}`);
      console.log(`   Name: ${savedUser.firstName} ${savedUser.lastName}`);
      console.log(`   Verified: ${savedUser.isVerified}`);
    } else {
      console.log('❌ User NOT found in database!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
};

testSignup();
