require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

const app = express();
app.use(express.json());

connectDB();

// Simple test route
app.post('/test-signup', async (req, res) => {
  console.log('Received signup request');
  console.log('Body:', req.body);
  
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  res.json({ success: true, message: 'Test passed' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});
