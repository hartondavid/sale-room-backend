require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NETLIFY_DATABASE_URL exists:', !!process.env.NETLIFY_DATABASE_URL);

if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL (first 50 chars):', process.env.DATABASE_URL.substring(0, 50) + '...');
}

if (process.env.NETLIFY_DATABASE_URL) {
    console.log('NETLIFY_DATABASE_URL (first 50 chars):', process.env.NETLIFY_DATABASE_URL.substring(0, 50) + '...');
}

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.log('Please set either DATABASE_URL or NETLIFY_DATABASE_URL in your .env file');
    process.exit(1);
}

console.log('✅ Connection string found');
console.log('Connection string starts with:', connectionString.substring(0, 20) + '...'); 