const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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
import('./src/routes/apiRoute.mjs').then(({ default: apiRoutes }) => {
    app.use('/api', apiRoutes);
    console.log('✅ API routes loaded successfully');
}).catch(error => {
    console.log('⚠️ API routes not available:', error.message);
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 Testing Neon database connection...');

        // Import database manager
        const { default: databaseManager } = await import('./src/utils/database.mjs');

        // Test database connection
        const knex = await databaseManager.getKnex();
        await knex.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Get database info
        const dbInfo = await knex.raw('SELECT current_database() as db_name, version() as version');

        res.json({
            success: true,
            message: "Neon database connection successful",
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