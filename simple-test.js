const { Client } = require('pg');
require('dotenv').config();

async function testSimpleConnection() {
    try {
        console.log('🔍 Testing simple PostgreSQL connection...');

        const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

        if (!connectionString) {
            console.error('❌ No connection string found');
            return;
        }

        console.log('📋 Connection string starts with:', connectionString.substring(0, 30) + '...');

        const client = new Client({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        const result = await client.query('SELECT current_database() as db_name, version() as version');
        console.log('📊 Database info:', result.rows[0]);

        await client.end();
        console.log('✅ Connection test successful');

    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.error('Full error:', error);
    }
}

testSimpleConnection(); 