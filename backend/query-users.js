#!/usr/bin/env node

/**
 * Extension Backend - User Query Test
 * This script checks what users exist in the shared MongoDB database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function queryUsers() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║     EXTENSION BACKEND - DATABASE USER QUERY                ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected\n');

        console.log('📋 Querying all users in database...\n');
        const users = await User.find({});

        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('\nYou need to create a user on the website first:');
            console.log('  1. Go to http://localhost:3000/signup.html');
            console.log('  2. Create an account');
            console.log('  3. Then try logging in via the extension\n');
        } else {
            console.log(`✅ Found ${users.length} user(s):\n`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Verified: ${user.isVerified}`);
                console.log(`   Created: ${user.createdAt}`);
                console.log(`   ID: ${user._id}\n`);
            });
        }

        await mongoose.connection.close();
        console.log('Closed MongoDB connection\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

queryUsers();
