const serverless = require('serverless-http');
const express = require('express');
const knex = require('knex');
const path = require('path');

const app = express();

// Configure knex for migrations
const knexConfig = {
    client: 'pg',
    connection: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    migrations: {
        directory: path.join(__dirname, '../../migrations')
    },
    seeds: {
        directory: path.join(__dirname, '../../seeds')
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

// Migration endpoint
app.post('/migrate', async (req, res) => {
    try {
        console.log('🔄 Starting migrations...');

        const db = knex(knexConfig);

        // Test connection first
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Run migrations
        const [batchNo, log] = await db.migrate.latest();
        console.log('✅ Migrations completed successfully');
        console.log('📋 Migration log:', log);

        await db.destroy();

        res.json({
            success: true,
            message: "Migrations completed successfully",
            batchNo,
            migrations: log
        });
    } catch (error) {
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            message: "Migration failed",
            error: error.message,
            stack: error.stack
        });
    }
});

// Seed endpoint
app.post('/seed', async (req, res) => {
    try {
        console.log('🌱 Starting seeds...');

        const db = knex(knexConfig);

        // Test connection first
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Run seeds
        const [batchNo, log] = await db.seed.run();
        console.log('✅ Seeds completed successfully');
        console.log('📋 Seed log:', log);

        await db.destroy();

        res.json({
            success: true,
            message: "Seeds completed successfully",
            batchNo,
            seeds: log
        });
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        res.status(500).json({
            success: false,
            message: "Seeding failed",
            error: error.message,
            stack: error.stack
        });
    }
});

// Setup endpoint (migrations + seeds)
app.post('/setup', async (req, res) => {
    try {
        console.log('🚀 Starting database setup...');

        const db = knex(knexConfig);

        // Test connection first
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Run migrations
        console.log('🔄 Running migrations...');
        const [migrationBatch, migrationLog] = await db.migrate.latest();
        console.log('✅ Migrations completed');

        // Run seeds
        console.log('🌱 Running seeds...');
        const [seedBatch, seedLog] = await db.seed.run();
        console.log('✅ Seeds completed');

        await db.destroy();

        res.json({
            success: true,
            message: "Database setup completed successfully",
            migrations: {
                batchNo: migrationBatch,
                log: migrationLog
            },
            seeds: {
                batchNo: seedBatch,
                log: seedLog
            }
        });
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        res.status(500).json({
            success: false,
            message: "Database setup failed",
            error: error.message,
            stack: error.stack
        });
    }
});

// Test connection endpoint
app.get('/test', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');

        const db = knex(knexConfig);

        // Test connection
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Get database info
        const dbInfo = await db.raw('SELECT current_database() as db_name, version() as version');

        // Check existing tables
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        await db.destroy();

        res.json({
            success: true,
            message: "Database connection successful",
            data: {
                database: dbInfo.rows[0].db_name,
                version: dbInfo.rows[0].version,
                tables: tables.rows.map(row => row.table_name),
                environment: process.env.NODE_ENV || 'production'
            }
        });
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports.handler = serverless(app); 