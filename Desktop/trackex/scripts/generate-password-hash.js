#!/usr/bin/env node

/**
 * Generate bcrypt password hash encoded in Base64 for .env file
 * Usage: node scripts/generate-password-hash.js [password]
 */

import { hash as _hash } from 'bcryptjs';
import { createInterface } from 'readline';

async function generateHash(password) {
  if (!password || password.trim().length === 0) {
    console.error('Error: Password cannot be empty');
    process.exit(1);
  }

  if (password.length < 8) {
    console.warn('Warning: Password is less than 8 characters. Consider using a stronger password.');
  }

  console.log('\nGenerating bcrypt hash...\n');

  const hash = await _hash(password, 12);
  const base64Hash = Buffer.from(hash).toString('base64');

  console.log('✅ Hash generated successfully!\n');
  console.log('━'.repeat(80));
  console.log('\n📋 Add this line to your .env file:\n');
  console.log(`OWNER_PASSWORD_HASH_B64=${base64Hash}`);
  console.log('\n━'.repeat(80));
  console.log('\n🔐 Password Details:');
  console.log(`  - Original hash: ${hash}`);
  console.log(`  - Base64 encoded: ${base64Hash}`);
  console.log(`  - Hash length: ${hash.length} characters`);
  console.log(`  - Base64 length: ${base64Hash.length} characters`);
  console.log(`  - Cost factor: 12 rounds`);
  console.log('\n💡 Test your login with:');
  console.log(`  - Email: ${process.env.OWNER_EMAIL || 'admin@trackex.com'}`);
  console.log(`  - Password: [the password you just entered]`);
  console.log('\n⚠️  Remember to restart your dev server after updating .env!\n');
}

// Check if password was provided as argument
const password = process.argv[2];

if (password) {
  // Password provided as argument
  generateHash(password).catch(err => {
    console.error('Error generating hash:', err);
    process.exit(1);
  });
} else {
  // Interactive mode - prompt for password
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('🔑 Enter the password to hash: ', async (password) => {
    rl.close();

    try {
      await generateHash(password);
    } catch (err) {
      console.error('Error generating hash:', err);
      process.exit(1);
    }
  });
}
