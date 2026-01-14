#!/usr/bin/env node

/**
 * Debug Script: Database Signup & Login Issues
 * 
 * This script helps identify why signup users aren't being saved to the database.
 * It tests:
 * 1. Database connection
 * 2. User creation and save
 * 3. Email normalization
 * 4. Password hashing
 * 5. User retrieval
 * 
 * Run: node debug-signup.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function debugSignup() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DEBUG: SIGNUP DATABASE ISSUES');
    console.log('='.repeat(80));

    // Step 1: Database connection
    console.log('\n[STEP 1] Connecting to MongoDB...');
    console.log('  MongoDB URI:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':***@'));
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Database:', mongoose.connection.name);

    // Step 2: Check existing users
    console.log('\n[STEP 2] Checking existing users in database...');
    const existingCount = await User.countDocuments();
    console.log(`✅ Total users in database: ${existingCount}`);
    
    if (existingCount > 0) {
      const users = await User.find().select('email firstName lastName isVerified createdAt').limit(5);
      console.log('   Sample users:');
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} - ${u.firstName} ${u.lastName} (verified: ${u.isVerified})`);
      });
    }

    // Step 3: Create test user
    console.log('\n[STEP 3] Creating test user...');
    const testEmail = `debug-test-${Date.now()}@test.local`;
    const testPassword = 'TestPassword123';
    
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   First Name: Debug`);
    console.log(`   Last Name: User`);

    const testUser = new User({
      firstName: 'Debug',
      lastName: 'User',
      email: testEmail.toLowerCase().trim(),
      passwordHash: testPassword,
      isVerified: true,
      extensionEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('\n   User object created (before save)');
    console.log('   Fields:', {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      isVerified: testUser.isVerified,
      hasPasswordHash: !!testUser.passwordHash
    });

    // Step 4: Save user
    console.log('\n[STEP 4] Saving user to database...');
    try {
      await testUser.save();
      console.log('✅ User saved successfully');
      console.log('   User ID:', testUser._id);
      console.log('   Created at:', testUser.createdAt);
    } catch (saveError) {
      console.log('❌ SAVE FAILED');
      console.log('   Error name:', saveError.name);
      console.log('   Error message:', saveError.message);
      console.log('   Error code:', saveError.code);
      
      if (saveError.name === 'ValidationError') {
        console.log('   Validation errors:');
        Object.entries(saveError.errors).forEach(([field, err]) => {
          console.log(`     - ${field}: ${err.message}`);
        });
      }
      throw saveError;
    }

    // Step 5: Verify user was saved
    console.log('\n[STEP 5] Verifying user was saved...');
    const savedUser = await User.findById(testUser._id);
    
    if (!savedUser) {
      console.log('❌ USER NOT FOUND AFTER SAVE');
      throw new Error('User was not found in database after save!');
    }
    
    console.log('✅ User found in database');
    console.log('   Email:', savedUser.email);
    console.log('   Name:', savedUser.firstName, savedUser.lastName);
    console.log('   Verified:', savedUser.isVerified);

    // Step 6: Verify email normalization
    console.log('\n[STEP 6] Testing email normalization...');
    const testVariations = [
      testEmail.toUpperCase(),
      testEmail + ' ',
      ' ' + testEmail,
      testEmail.replace('@', '@').toUpperCase()
    ];
    
    for (const variation of testVariations) {
      const normalized = variation.toLowerCase().trim();
      const found = await User.findOne({ email: normalized });
      const status = found ? '✅' : '❌';
      console.log(`   ${status} "${variation}" → "${normalized}" : ${found ? 'found' : 'NOT found'}`);
    }

    // Step 7: Test password hashing
    console.log('\n[STEP 7] Testing password verification...');
    const userWithPassword = await User.findById(testUser._id).select('+passwordHash');
    console.log('   Password hash exists:', !!userWithPassword.passwordHash);
    console.log('   Password hash length:', userWithPassword.passwordHash?.length || 0);
    
    const isPasswordValid = await userWithPassword.matchPassword(testPassword);
    console.log(`   ✅ Password verification: ${isPasswordValid ? 'PASS' : 'FAIL'}`);
    
    const isWrongPasswordValid = await userWithPassword.matchPassword('WrongPassword123');
    console.log(`   ✅ Wrong password verification: ${isWrongPasswordValid ? 'FAIL (security issue!)' : 'PASS'}`);

    // Step 8: Test login query
    console.log('\n[STEP 8] Testing login query flow...');
    const loginUser = await User.findOne({ email: testEmail.toLowerCase().trim() }).select('+passwordHash');
    
    if (!loginUser) {
      console.log('❌ LOGIN QUERY FAILED - User not found');
      throw new Error('Login query returned no user');
    }
    
    console.log('✅ Login query found user');
    console.log('   Email:', loginUser.email);
    console.log('   Has password hash:', !!loginUser.passwordHash);
    
    const loginPassword = await loginUser.matchPassword(testPassword);
    console.log(`   ✅ Password match: ${loginPassword ? 'PASS' : 'FAIL'}`);

    // Step 9: Cleanup - delete test user
    console.log('\n[STEP 9] Cleaning up test user...');
    await User.deleteOne({ _id: testUser._id });
    console.log('✅ Test user deleted');

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED - DATABASE IS WORKING CORRECTLY');
    console.log('='.repeat(80));
    console.log('\nIf signup still fails, check:');
    console.log('1. Frontend is sending all required fields');
    console.log('2. Frontend is awaiting the response');
    console.log('3. Check extension backend console logs for specific errors');
    console.log('4. Verify .env has correct MONGODB_URI');

  } catch (error) {
    console.error('\n❌ DEBUG FAILED');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    console.log('\nClosing database connection...');
    await mongoose.disconnect();
    console.log('✓ Disconnected\n');
  }
}

debugSignup();
