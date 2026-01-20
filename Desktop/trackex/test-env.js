require('dotenv').config({ path: '.env.production' });
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET ✓' : 'NOT SET ✗');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'SET ✓' : 'NOT SET ✗');
