const serverless = require('serverless-http');
const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();

// Database connection config
const dbConfig = {
    connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
};

// Migration endpoint
app.post('/migrate', async (req, res) => {
    try {
        console.log('🔄 Starting migrations...');

        const client = new Client(dbConfig);
        await client.connect();
        console.log('✅ Database connection successful');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS knex_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of migration files
        const migrationsDir = path.join(__dirname, '../../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.cjs'))
            .sort();

        console.log('📋 Found migration files:', migrationFiles);

        // Get already executed migrations
        const executedMigrations = await client.query('SELECT name FROM knex_migrations ORDER BY id');
        const executedNames = executedMigrations.rows.map(row => row.name);

        // Find new migrations to run
        const newMigrations = migrationFiles.filter(file => !executedNames.includes(file));

        if (newMigrations.length === 0) {
            console.log('✅ No new migrations to run');
            await client.end();
            return res.json({
                success: true,
                message: "No new migrations to run",
                migrations: []
            });
        }

        // Get next batch number
        const batchResult = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations');
        const nextBatch = batchResult.rows[0].next_batch;

        const executedMigrationsList = [];

        // Run each migration
        for (const migrationFile of newMigrations) {
            console.log(`🔄 Running migration: ${migrationFile}`);

            const migrationPath = path.join(migrationsDir, migrationFile);
            const migration = require(migrationPath);

            // Run the migration
            await migration.up(client);

            // Record the migration
            await client.query(
                'INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)',
                [migrationFile, nextBatch]
            );

            executedMigrationsList.push(migrationFile);
            console.log(`✅ Migration completed: ${migrationFile}`);
        }

        await client.end();

        res.json({
            success: true,
            message: "Migrations completed successfully",
            batchNo: nextBatch,
            migrations: executedMigrationsList
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

        const client = new Client(dbConfig);
        await client.connect();
        console.log('✅ Database connection successful');

        // Get list of seed files
        const seedsDir = path.join(__dirname, '../../seeds');
        const seedFiles = fs.readdirSync(seedsDir)
            .filter(file => file.endsWith('.cjs') || file.endsWith('.js'))
            .sort();

        console.log('📋 Found seed files:', seedFiles);

        const executedSeeds = [];

        // Run each seed
        for (const seedFile of seedFiles) {
            console.log(`🌱 Running seed: ${seedFile}`);

            const seedPath = path.join(seedsDir, seedFile);
            const seed = require(seedPath);

            // Run the seed
            await seed.seed(client);

            executedSeeds.push(seedFile);
            console.log(`✅ Seed completed: ${seedFile}`);
        }

        await client.end();

        res.json({
            success: true,
            message: "Seeds completed successfully",
            seeds: executedSeeds
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

        const client = new Client(dbConfig);
        await client.connect();
        console.log('✅ Database connection successful');

        // Run migrations first
        console.log('🔄 Running migrations...');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS knex_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of migration files
        const migrationsDir = path.join(__dirname, '../../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.cjs'))
            .sort();

        // Get already executed migrations
        const executedMigrations = await client.query('SELECT name FROM knex_migrations ORDER BY id');
        const executedNames = executedMigrations.rows.map(row => row.name);

        // Find new migrations to run
        const newMigrations = migrationFiles.filter(file => !executedNames.includes(file));

        // Get next batch number
        const batchResult = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations');
        const nextBatch = batchResult.rows[0].next_batch;

        const executedMigrationsList = [];

        // Run each migration
        for (const migrationFile of newMigrations) {
            console.log(`🔄 Running migration: ${migrationFile}`);

            const migrationPath = path.join(migrationsDir, migrationFile);
            const migration = require(migrationPath);

            // Run the migration
            await migration.up(client);

            // Record the migration
            await client.query(
                'INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)',
                [migrationFile, nextBatch]
            );

            executedMigrationsList.push(migrationFile);
            console.log(`✅ Migration completed: ${migrationFile}`);
        }

        console.log('✅ Migrations completed');

        // Run seeds
        console.log('🌱 Running seeds...');

        // Get list of seed files
        const seedsDir = path.join(__dirname, '../../seeds');
        const seedFiles = fs.readdirSync(seedsDir)
            .filter(file => file.endsWith('.cjs') || file.endsWith('.js'))
            .sort();

        const executedSeeds = [];

        // Run each seed
        for (const seedFile of seedFiles) {
            console.log(`🌱 Running seed: ${seedFile}`);

            const seedPath = path.join(seedsDir, seedFile);
            const seed = require(seedPath);

            // Run the seed
            await seed.seed(client);

            executedSeeds.push(seedFile);
            console.log(`✅ Seed completed: ${seedFile}`);
        }

        console.log('✅ Seeds completed');

        await client.end();

        res.json({
            success: true,
            message: "Database setup completed successfully",
            migrations: {
                batchNo: nextBatch,
                log: executedMigrationsList
            },
            seeds: {
                log: executedSeeds
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

        const client = new Client(dbConfig);
        await client.connect();
        console.log('✅ Database connection successful');

        // Get database info
        const dbInfo = await client.query('SELECT current_database() as db_name, version() as version');

        // Check existing tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        await client.end();

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