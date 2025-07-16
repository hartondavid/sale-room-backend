// app.js

import express from "express"
import dotenv from 'dotenv'
import apiRouter from './src/routes/apiRoute.mjs'
import cors from 'cors'
import databaseManager from './src/utils/database.mjs'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const app = express();

dotenv.config()

app.set('trust proxy', true);

app.use(cors({
    origin: '*', // Allow any origin
    exposedHeaders: ['X-Auth-Token', 'X-Message', 'Content-Disposition'], // Expose the custom header


}));


// Run migrations before starting the server
const runMigrations = async () => {
    try {
        console.log('🔄 Starting database setup...');

        // First, test database connection
        console.log('🔌 Testing database connection...');
        const knex = await databaseManager.getKnex();
        console.log('✅ Database connection successful');

        // Check if database exists and show tables
        try {
            const tables = await knex.raw('SHOW TABLES');
            console.log('📋 Existing tables:', tables[0].map(table => Object.values(table)[0]));
        } catch (error) {
            console.log('⚠️ Could not check tables:', error.message);
        }

        console.log('🔄 Running migrations...');
        await databaseManager.runMigrations();
        console.log('✅ Migrations completed successfully');

        // Check tables after migrations
        try {
            const tablesAfter = await knex.raw('SHOW TABLES');
            console.log('📋 Tables after migrations:', tablesAfter[0].map(table => Object.values(table)[0]));
        } catch (error) {
            console.log('⚠️ Could not check tables after migrations:', error.message);
        }

        // Run seeds after migrations
        console.log('🌱 Running database seeds...');
        await databaseManager.runSeeds();
        console.log('✅ Seeds completed successfully');

        // Run custom seeds from seeds directory
        console.log('🌱 Running custom seeds...');
        await runCustomSeeds();
        console.log('✅ Custom seeds completed successfully');

        // Check data after seeds
        try {
            const users = await knex('users').select('id', 'name', 'email');
            console.log('👥 Users after seeds:', users);
        } catch (error) {
            console.log('⚠️ Could not check users after seeds:', error.message);
        }

        return true;
    } catch (error) {
        console.error('❌ Migration/Seed failed:', error.message);
        console.error('🔍 Error details:', error.stack);
        return false;
    }
};

// Import API routes (with error handling)
let apiRoutes = null;
try {
    // Run migrations first
    const migrationsSuccess = await runMigrations();
    if (!migrationsSuccess) {
        console.log('⚠️ Continuing without database migrations');
    }

    const { default: apiRoute } = await import('./src/routes/apiRoute.mjs');
    apiRoutes = apiRoute;
    console.log('✅ Database API routes loaded successfully');
} catch (error) {
    console.log('⚠️ Database API routes not available, using simplified version');
    console.log('🔍 Error:', error.message);
}


// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to run custom seeds from seeds directory
const runCustomSeeds = async () => {
    try {
        console.log('🌱 Running custom seeds from seeds directory...');
        const knex = await databaseManager.getKnex();
        const seedsDir = join(__dirname, 'seeds');

        // Read all files from seeds directory
        const files = await readdir(seedsDir);

        // Filter for .cjs and .js files and sort them
        const seedFiles = files
            .filter(file => file.endsWith('.cjs') || file.endsWith('.js'))
            .sort(); // This will sort alphabetically (01_, 02_, etc.)

        console.log(`📁 Found ${seedFiles.length} seed files:`, seedFiles);

        // Execute each seed file
        for (const file of seedFiles) {
            try {
                console.log(`🌱 Executing seed file: ${file}`);
                const filePath = join(seedsDir, file);

                // Import the seed file
                const seedModule = await import(filePath);

                if (seedModule.exports && seedModule.exports.seed) {
                    await seedModule.exports.seed(knex);
                    console.log(`✅ Successfully executed: ${file}`);
                } else if (seedModule.default && seedModule.default.seed) {
                    await seedModule.default.seed(knex);
                    console.log(`✅ Successfully executed: ${file}`);
                } else {
                    console.log(`⚠️ No seed function found in: ${file}`);
                }
            } catch (error) {
                console.error(`❌ Error executing seed file ${file}:`, error.message);
                // Continue with other files even if one fails
            }
        }

        console.log('✅ Custom seeds completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Custom seeds failed:', error.message);
        console.error('🔍 Error details:', error.stack);
        return false;
    }
};

// Use API routes if available, otherwise use simplified routes
if (apiRoutes) {
    app.use('/api', apiRoutes);
    console.log('📡 Full API available at /api/*');
} else {
    console.log('📡 Using simplified API (no database)');
}


// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to parse x-www-form-urlencoded data
app.use(express.urlencoded({ extended: true }));

// Other middlewares
app.use(express.json());

app.use('/api/', apiRouter)

export default app;