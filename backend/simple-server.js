const http = require('http');

const server = http.createServer((req, res) => {
  try {
    console.log(`${req.method} ${req.url}`);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('Request error:', err);
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err);
});

server.listen(5000, () => {
  console.log('Simple server running on port 5000');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', reason);
});
