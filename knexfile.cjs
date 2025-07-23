// knexfile.js
require('dotenv').config();

// This is the base configuration that will be shared
const baseConfig = {
    client: 'pg', // PostgreSQL for Neon database
    migrations: {
        directory: './migrations'
    },
    seeds: {
        directory: './seeds'
    }
};

module.exports = {
    // --- Development Environment ---
    // Used when you run your app locally
    development: {
        ...baseConfig,
        connection: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL,
    },

    // --- Production Environment ---
    // Used by Netlify when you deploy
    production: {
        ...baseConfig,
        connection: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL,
        // SSL is required for connecting to Neon from Netlify
        ssl: { rejectUnauthorized: false },
        // Optimized pool config for serverless environment
        pool: {
            min: 0, // Start with 0 connections
            max: 1, // Maximum 1 connection per function instance
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 100
        }
    }
};