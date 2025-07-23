const knex = require('knex');
const path = require('path');
require('dotenv').config();

// Check environment variables
console.log('🔍 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NETLIFY_DATABASE_URL exists:', !!process.env.NETLIFY_DATABASE_URL);

const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.log('Please set either DATABASE_URL or NETLIFY_DATABASE_URL in your .env file');
    process.exit(1);
}

console.log('✅ Connection string found');
console.log('Connection string starts with:', connectionString.substring(0, 20) + '...');

// Configure knex for local testing
const knexConfig = {
    client: 'pg',
    connection: connectionString,
    ssl: { rejectUnauthorized: false },
    migrations: {
        directory: path.join(__dirname, 'migrations')
    },
    seeds: {
        directory: path.join(__dirname, 'seeds')
    },
    pool: {
        min: 0,
        max: 1,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100
    }
};

async function testMigration() {
    try {
        console.log('🔍 Testing migration locally...');

        const db = knex(knexConfig);

        // Test connection
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Check current migration status
        const current = await db.migrate.currentVersion();
        console.log('📋 Current migration version:', current);

        // List all migrations
        const list = await db.migrate.list();
        console.log('📋 Available migrations:', list);

        // Run migrations
        console.log('🔄 Running migrations...');
        const [batchNo, log] = await db.migrate.latest();
        console.log('✅ Migrations completed successfully');
        console.log('📋 Migration log:', log);

        await db.destroy();
        console.log('✅ Test completed successfully');

    } catch (error) {
        console.error('❌ Migration test failed:', error);
        process.exit(1);
    }
}

testMigration(); 