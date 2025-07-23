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

// Raw SQL migrations
const migrations = [
    {
        name: '20250523211638_create_users_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                last_login INTEGER NULL,
                photo INTEGER NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                confirm_password VARCHAR(255) NOT NULL,
                phone VARCHAR(255) NOT NULL UNIQUE
            )
        `,
        down: 'DROP TABLE IF EXISTS users CASCADE'
    },
    {
        name: '20250523211941_create_products_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                category VARCHAR(255),
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS products CASCADE'
    },
    {
        name: '20250523212026_create_shopping_carts_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS shopping_carts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS shopping_carts CASCADE'
    },
    {
        name: '20250523212111_create_orders_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                shipping_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS orders CASCADE'
    },
    {
        name: '20250523212226_create_payments_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                transaction_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS payments CASCADE'
    },
    {
        name: '20250523212304_create_cart_items_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS cart_items CASCADE'
    },
    {
        name: '20250523212352_create_order_items_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS order_items CASCADE'
    },
    {
        name: '20250523212932_create_rights_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS rights (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        down: 'DROP TABLE IF EXISTS rights CASCADE'
    },
    {
        name: '20250523212945_create_user_rights_table.cjs',
        up: `
            CREATE TABLE IF NOT EXISTS user_rights (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                right_id INTEGER NOT NULL REFERENCES rights(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, right_id)
            )
        `,
        down: 'DROP TABLE IF EXISTS user_rights CASCADE'
    }
];

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

        // Get already executed migrations
        const executedMigrations = await client.query('SELECT name FROM knex_migrations ORDER BY id');
        const executedNames = executedMigrations.rows.map(row => row.name);

        // Find new migrations to run
        const newMigrations = migrations.filter(migration => !executedNames.includes(migration.name));

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
        for (const migration of newMigrations) {
            console.log(`🔄 Running migration: ${migration.name}`);

            // Execute the migration SQL
            await client.query(migration.up);

            // Record the migration
            await client.query(
                'INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)',
                [migration.name, nextBatch]
            );

            executedMigrationsList.push(migration.name);
            console.log(`✅ Migration completed: ${migration.name}`);
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

        // Raw seed data
        const seeds = [
            {
                name: '01_users.cjs',
                sql: `
                    INSERT INTO users (name, email, password, confirm_password, phone) VALUES
                    ('Admin User', 'admin@example.com', '$2b$10$hashedpassword', '$2b$10$hashedpassword', '+1234567890'),
                    ('Test User', 'test@example.com', '$2b$10$hashedpassword', '$2b$10$hashedpassword', '+0987654321')
                    ON CONFLICT (email) DO NOTHING
                `
            },
            {
                name: '02_rights.cjs',
                sql: `
                    INSERT INTO rights (name, description) VALUES
                    ('admin', 'Administrator access'),
                    ('user', 'Regular user access'),
                    ('moderator', 'Moderator access')
                    ON CONFLICT (name) DO NOTHING
                `
            },
            {
                name: '03_user_rights.js',
                sql: `
                    INSERT INTO user_rights (user_id, right_id)
                    SELECT u.id, r.id
                    FROM users u, rights r
                    WHERE u.email = 'admin@example.com' AND r.name = 'admin'
                    ON CONFLICT (user_id, right_id) DO NOTHING
                `
            }
        ];

        const executedSeeds = [];

        // Run each seed
        for (const seed of seeds) {
            console.log(`🌱 Running seed: ${seed.name}`);

            // Execute the seed SQL
            await client.query(seed.sql);

            executedSeeds.push(seed.name);
            console.log(`✅ Seed completed: ${seed.name}`);
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

        // Get already executed migrations
        const executedMigrations = await client.query('SELECT name FROM knex_migrations ORDER BY id');
        const executedNames = executedMigrations.rows.map(row => row.name);

        // Find new migrations to run
        const newMigrations = migrations.filter(migration => !executedNames.includes(migration.name));

        // Get next batch number
        const batchResult = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations');
        const nextBatch = batchResult.rows[0].next_batch;

        const executedMigrationsList = [];

        // Run each migration
        for (const migration of newMigrations) {
            console.log(`🔄 Running migration: ${migration.name}`);

            // Execute the migration SQL
            await client.query(migration.up);

            // Record the migration
            await client.query(
                'INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)',
                [migration.name, nextBatch]
            );

            executedMigrationsList.push(migration.name);
            console.log(`✅ Migration completed: ${migration.name}`);
        }

        console.log('✅ Migrations completed');

        // Run seeds
        console.log('🌱 Running seeds...');

        // Raw seed data
        const seeds = [
            {
                name: '01_users.cjs',
                sql: `
                    INSERT INTO users (name, email, password, confirm_password, phone) VALUES
                    ('Admin User', 'admin@example.com', '$2b$10$hashedpassword', '$2b$10$hashedpassword', '+1234567890'),
                    ('Test User', 'test@example.com', '$2b$10$hashedpassword', '$2b$10$hashedpassword', '+0987654321')
                    ON CONFLICT (email) DO NOTHING
                `
            },
            {
                name: '02_rights.cjs',
                sql: `
                    INSERT INTO rights (name, description) VALUES
                    ('admin', 'Administrator access'),
                    ('user', 'Regular user access'),
                    ('moderator', 'Moderator access')
                    ON CONFLICT (name) DO NOTHING
                `
            },
            {
                name: '03_user_rights.js',
                sql: `
                    INSERT INTO user_rights (user_id, right_id)
                    SELECT u.id, r.id
                    FROM users u, rights r
                    WHERE u.email = 'admin@example.com' AND r.name = 'admin'
                    ON CONFLICT (user_id, right_id) DO NOTHING
                `
            }
        ];

        const executedSeeds = [];

        // Run each seed
        for (const seed of seeds) {
            console.log(`🌱 Running seed: ${seed.name}`);

            // Execute the seed SQL
            await client.query(seed.sql);

            executedSeeds.push(seed.name);
            console.log(`✅ Seed completed: ${seed.name}`);
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