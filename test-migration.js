const knex = require('knex');
const path = require('path');
require('dotenv').config();

// Configure knex for local testing
const knexConfig = {
    client: 'pg',
    connection: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    migrations: {
        directory: path.join(__dirname, 'migrations')
    },
    seeds: {
        directory: path.join(__dirname, 'seeds')
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