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
        // Import database test utility
        const { testDatabaseConnection } = await import('./src/utils/databaseTest.mjs');

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

// Database setup endpoint (run migrations and seeds)
app.post('/api/setup-db', async (req, res) => {
    try {
        const { runMigrations, runSeeds } = await import('./src/utils/databaseTest.mjs');

        // Run migrations
        const migrationResult = await runMigrations();
        if (!migrationResult.success) {
            return res.status(500).json(migrationResult);
        }

        // Run seeds
        const seedResult = await runSeeds();
        if (!seedResult.success) {
            return res.status(500).json(seedResult);
        }

        res.json({
            success: true,
            message: "Database setup completed successfully",
            migrations: migrationResult,
            seeds: seedResult
        });
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