import { default as databaseManager } from './database.mjs';

export const testDatabaseConnection = async () => {
    try {
        console.log('🔍 Testing Neon database connection...');

        // Get database connection
        const knex = await databaseManager.getKnex();

        // Test basic connection
        await knex.raw('SELECT 1');
        console.log('✅ Basic connection test passed');

        // Get database information
        const dbInfo = await knex.raw('SELECT current_database() as db_name, version() as version');
        console.log('📊 Database info:', dbInfo.rows[0]);

        // Test table existence
        const tables = await knex.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Available tables:', tables.rows.map(row => row.table_name));

        return {
            success: true,
            message: "Database connection successful",
            data: {
                database: dbInfo.rows[0].db_name,
                version: dbInfo.rows[0].version,
                tables: tables.rows.map(row => row.table_name),
                environment: process.env.NODE_ENV || 'production'
            }
        };
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return {
            success: false,
            message: "Database connection failed",
            error: error.message,
            stack: error.stack
        };
    }
};

export const runMigrations = async () => {
    try {
        console.log('🔄 Running database migrations...');
        await databaseManager.runMigrations();
        console.log('✅ Migrations completed successfully');
        return { success: true, message: "Migrations completed" };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
};

export const runSeeds = async () => {
    try {
        console.log('🌱 Running database seeds...');
        await databaseManager.runSeeds();
        console.log('✅ Seeds completed successfully');
        return { success: true, message: "Seeds completed" };
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        return { success: false, error: error.message };
    }
}; 