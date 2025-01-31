#!/usr/bin/env node

const crypto = require('crypto');

// Generate a random 32-byte base64 string
const secret = crypto.randomBytes(32).toString('base64');

console.log('\nGenerated NEXTAUTH_SECRET for production:');
console.log('----------------------------------------');
console.log(secret);
console.log('----------------------------------------');
console.log('\nAdd this to your Railway environment variables as NEXTAUTH_SECRET\n');
