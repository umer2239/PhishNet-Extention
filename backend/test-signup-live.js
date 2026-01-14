const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const testEmail = 'test' + Date.now() + '@test.com';
const postData = JSON.stringify({
  firstName: 'Test',
  lastName: 'User',
  email: testEmail,
  password: 'TestPass123!',
  confirmPassword: 'TestPass123!'
});

console.log('🧪 Testing Extension Signup Flow');
console.log('================================');
console.log('Test email:', testEmail);
console.log('Target: http://localhost:5000/api/v1/auth/signup\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', async () => {
    console.log('📡 Response Status:', res.statusCode);
    console.log('📦 Response Body:', data);
    console.log('');
    
    try {
      // Connect to database and verify
      console.log('🔍 Verifying in database...');
      await mongoose.connect(process.env.MONGODB_URI);
      
      const savedUser = await User.findOne({ email: testEmail.toLowerCase() });
      
      if (savedUser) {
        console.log('✅ SUCCESS - USER FOUND IN DATABASE!');
        console.log('   Name:', savedUser.firstName, savedUser.lastName);
        console.log('   Email:', savedUser.email);
        console.log('   Verified:', savedUser.isVerified);
        console.log('   ID:', savedUser._id);
      } else {
        console.log('❌ FAILED - USER NOT FOUND IN DATABASE!');
        console.log('   The signup endpoint returned success but user was not saved.');
      }
      
      await mongoose.connection.close();
      process.exit(savedUser ? 0 : 1);
    } catch (err) {
      console.error('❌ Database verification error:', err.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ HTTP Request Error:', error.message);
  console.error('   Is the backend server running on port 5000?');
  process.exit(1);
});

req.write(postData);
req.end();
