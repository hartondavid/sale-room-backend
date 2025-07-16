#!/usr/bin/env node

import crypto from 'crypto';

// Generate a secure random JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Generated JWT Secret for AWS App Runner:');
console.log('');
console.log('JWT_SECRET=' + jwtSecret);
console.log('');
console.log('📋 Instructions:');
console.log('1. Copy the JWT_SECRET value above');
console.log('2. Go to AWS App Runner console');
console.log('3. Select your service');
console.log('4. Go to "Configuration" → "General configuration"');
console.log('5. Add environment variable:');
console.log('   - Key: JWT_SECRET');
console.log('   - Value: (paste the generated secret)');
console.log('6. Save and redeploy your service');
console.log('');
console.log('⚠️  Important: Keep this secret secure and don\'t share it!'); 