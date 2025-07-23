const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Auth-Token']
}));

// Import your routes
import('../../src/routes/apiRoute.mjs').then(({ default: apiRoutes }) => {
    app.use('/api', apiRoutes);
    console.log('✅ API routes loaded successfully');
}).catch(error => {
    console.log('⚠️ API routes not available:', error.message);
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 Testing database connection...');

        // Use direct PostgreSQL client instead of knex
        const { Client } = require('pg');

        const client = new Client({
            connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('✅ Basic connection test passed');

        // Get database information
        const dbInfo = await client.query('SELECT current_database() as db_name, version() as version');
        console.log('📊 Database info:', dbInfo.rows[0]);

        // Test table existence
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Available tables:', tables.rows.map(row => row.table_name));

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
        console.error('❌ Database connection test failed:', error);
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message,
            stack: error.stack
        });
    }
});

// Simple database test endpoint
app.get('/api/simple-db-test', async (req, res) => {
    try {
        console.log('🔍 Testing simple database connection...');

        // Use direct PostgreSQL client instead of knex
        const { Client } = require('pg');

        const client = new Client({
            connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('✅ Database connection successful');

        // Get database info
        const dbInfo = await client.query('SELECT current_database() as db_name, version() as version');

        await client.end();

        res.json({
            success: true,
            message: "Database connection successful",
            data: {
                database: dbInfo.rows[0].db_name,
                version: dbInfo.rows[0].version,
                environment: process.env.NODE_ENV || 'production'
            }
        });
    } catch (error) {
        console.error("Database test error:", error);
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message,
            environment: process.env.NODE_ENV || 'production'
        });
    }
});

// Database setup endpoint (redirects to migrate function)
app.post('/api/setup-db', async (req, res) => {
    try {
        // Redirect to the migrate function
        const baseUrl = req.get('host') || 'localhost:8888';
        const protocol = req.get('x-forwarded-proto') || 'http';

        const response = await fetch(`${protocol}://${baseUrl}/.netlify/functions/migrate/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error("Database setup error:", error);
        res.status(500).json({
            success: false,
            message: "Database setup failed",
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Sale Room Backend API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Export the serverless handler
module.exports.handler = serverless(app); 