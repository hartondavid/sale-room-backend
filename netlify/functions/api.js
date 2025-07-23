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
        // Import database test utility
        const { testDatabaseConnection } = await import('../../src/utils/databaseTest.mjs');

        const result = await testDatabaseConnection();

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
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

// Simple database test endpoint
app.get('/api/simple-db-test', async (req, res) => {
    try {
        console.log('🔍 Testing simple database connection...');

        // Import database manager with correct path
        const { default: databaseManager } = await import('../../src/utils/database.mjs');

        // Test database connection
        const knex = await databaseManager.getKnex();
        await knex.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Get database info
        const dbInfo = await knex.raw('SELECT current_database() as db_name, version() as version');

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