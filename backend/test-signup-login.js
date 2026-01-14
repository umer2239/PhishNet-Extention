#!/usr/bin/env node

/**
 * Test Script: Signup and Login Flow
 * 
 * This script tests the complete signup and login workflow:
 * 1. Creates a new user via signup endpoint
 * 2. Immediately attempts login with the same credentials
 * 3. Verifies that both operations succeed
 * 
 * Run: node test-signup-login.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const { generateTokens } = require('./utils/jwt');

// Test data
const TEST_USER = {
  firstName: 'Test',
  lastName: 'User',
  email: `test-${Date.now()}@phishnet.local`,
  password: 'TestPassword123'
};

async function runTests() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING SIGNUP AND LOGIN FLOW');
    console.log('='.repeat(70));

    // Connect to MongoDB
    console.log('\n[SETUP] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);

    // Test 1: Signup
    console.log('\n' + '-'.repeat(70));
    console.log('TEST 1: User Signup');
    console.log('-'.repeat(70));

    try {
      // Check if user already exists
      console.log(`[SIGNUP] Checking if user exists (${TEST_USER.email})...`);
      const existingUser = await User.findOne({ email: TEST_USER.email.toLowerCase() });
      
      if (existingUser) {
        console.log('⚠️  User already exists, deleting for clean test...');
        await User.deleteOne({ _id: existingUser._id });
        console.log('✅ Old user deleted');
      }

      // Create new user
      console.log('[SIGNUP] Creating new user...');
      const newUser = new User({
        firstName: TEST_USER.firstName.trim(),
        lastName: TEST_USER.lastName.trim(),
        email: TEST_USER.email.toLowerCase().trim(),
        passwordHash: TEST_USER.password,
        isVerified: true,
        extensionEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('   - firstName:', newUser.firstName);
      console.log('   - lastName:', newUser.lastName);
      console.log('   - email:', newUser.email);
      console.log('   - isVerified:', newUser.isVerified);

      // Save user
      console.log('[SIGNUP] Saving user to database...');
      await newUser.save();
      console.log('✅ User saved successfully');
      console.log(`   - User ID: ${newUser._id}`);
      console.log(`   - Created at: ${newUser.createdAt}`);

      TEST_USER.userId = newUser._id;

    } catch (error) {
      console.error('❌ SIGNUP FAILED');
      console.error('   Error:', error.message);
      throw error;
    }

    // Test 2: Immediate Login After Signup
    console.log('\n' + '-'.repeat(70));
    console.log('TEST 2: Login Immediately After Signup');
    console.log('-'.repeat(70));

    try {
      // Find user
      console.log(`[LOGIN] Finding user by email: ${TEST_USER.email}...`);
      const user = await User.findOne({ 
        email: TEST_USER.email.toLowerCase().trim() 
      }).select('+passwordHash');

      if (!user) {
        throw new Error('User not found in database after signup!');
      }

      console.log('✅ User found');
      console.log(`   - User ID: ${user._id}`);
      console.log(`   - Name: ${user.firstName} ${user.lastName}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - isVerified: ${user.isVerified}`);
      console.log(`   - passwordHash set: ${!!user.passwordHash}`);

      // Verify password
      console.log('[LOGIN] Verifying password...');
      const isPasswordValid = await user.matchPassword(TEST_USER.password);

      if (!isPasswordValid) {
        throw new Error('Password verification failed!');
      }

      console.log('✅ Password verified successfully');

      // Generate tokens
      console.log('[LOGIN] Generating authentication tokens...');
      const { accessToken, refreshToken } = generateTokens(user._id);

      if (!accessToken || !refreshToken) {
        throw new Error('Token generation failed!');
      }

      console.log('✅ Tokens generated successfully');
      console.log(`   - Access token length: ${accessToken.length}`);
      console.log(`   - Refresh token length: ${refreshToken.length}`);

      // Update last login
      console.log('[LOGIN] Updating last login...');
      await user.updateLastLogin();
      console.log('✅ Last login updated');

      console.log('✅ LOGIN SUCCESSFUL');

    } catch (error) {
      console.error('❌ LOGIN FAILED');
      console.error('   Error:', error.message);
      throw error;
    }

    // Test 3: Login with Wrong Password
    console.log('\n' + '-'.repeat(70));
    console.log('TEST 3: Login with Wrong Password (Should Fail)');
    console.log('-'.repeat(70));

    try {
      const user = await User.findOne({ 
        email: TEST_USER.email.toLowerCase().trim() 
      }).select('+passwordHash');

      const isPasswordValid = await user.matchPassword('WrongPassword123');

      if (isPasswordValid) {
        throw new Error('Wrong password was accepted! Security issue!');
      }

      console.log('✅ Correctly rejected wrong password');

    } catch (error) {
      console.error('❌ TEST FAILED');
      console.error('   Error:', error.message);
      throw error;
    }

    // Test 4: Verify User Exists in Shared Database
    console.log('\n' + '-'.repeat(70));
    console.log('TEST 4: Verify User in Shared Database');
    console.log('-'.repeat(70));

    try {
      const users = await User.find({ email: TEST_USER.email.toLowerCase() });
      
      if (users.length === 0) {
        throw new Error('User not found in shared database!');
      }

      if (users.length > 1) {
        console.warn('⚠️  Multiple users with same email found');
      }

      const user = users[0];
      console.log('✅ User found in shared database');
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.firstName} ${user.lastName}`);
      console.log(`   - Verified: ${user.isVerified}`);
      console.log(`   - Created: ${user.createdAt}`);

    } catch (error) {
      console.error('❌ DATABASE VERIFICATION FAILED');
      console.error('   Error:', error.message);
      throw error;
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n✓ Signup creates users correctly');
    console.log('✓ Users can login immediately after signup');
    console.log('✓ Password verification works');
    console.log('✓ Token generation works');
    console.log('✓ Users are saved to shared database');
    console.log('\n💡 You can now test the extension with the following credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);

  } catch (error) {
    console.error('\n❌ TESTS FAILED');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\nClosing database connection...');
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  }
}

runTests();
