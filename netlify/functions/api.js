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

// Migration redirects
app.get('/api/migrate/test', async (req, res) => {
    try {
        const baseUrl = req.get('host') || 'localhost:8888';
        const protocol = req.get('x-forwarded-proto') || 'http';

        const response = await fetch(`${protocol}://${baseUrl}/.netlify/functions/migrate/test`);
        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error("Migration test error:", error);
        res.status(500).json({
            success: false,
            message: "Migration test failed",
            error: error.message
        });
    }
});

app.post('/api/migrate/migrate', async (req, res) => {
    try {
        const baseUrl = req.get('host') || 'localhost:8888';
        const protocol = req.get('x-forwarded-proto') || 'http';

        const response = await fetch(`${protocol}://${baseUrl}/.netlify/functions/migrate/migrate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error("Migration error:", error);
        res.status(500).json({
            success: false,
            message: "Migration failed",
            error: error.message
        });
    }
});

app.post('/api/migrate/seed', async (req, res) => {
    try {
        const baseUrl = req.get('host') || 'localhost:8888';
        const protocol = req.get('x-forwarded-proto') || 'http';

        const response = await fetch(`${protocol}://${baseUrl}/.netlify/functions/migrate/seed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        res.json(result);
    } catch (error) {
        console.error("Seed error:", error);
        res.status(500).json({
            success: false,
            message: "Seed failed",
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