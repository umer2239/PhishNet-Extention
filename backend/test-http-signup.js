const http = require('http');

const email = `httptest${Date.now()}@test.local`;
const payload = JSON.stringify({
  firstName: 'HttpTest',
  lastName: 'User',
  email: email,
  password: 'HttpTest123!',
  confirmPassword: 'HttpTest123!'
});

console.log(`📧 Testing signup via HTTP`);
console.log(`Email: ${email}`);
console.log(`Payload: ${payload}\n`);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Response Status: ${res.statusCode}`);
  console.log(`Response Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📦 Response Body:`);
    console.log(data);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error(`❌ Request Error: ${error.message}`);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('❌ Request Timeout');
  process.exit(1);
});

console.log('Sending request...\n');
req.write(payload);
req.end();
