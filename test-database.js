import databaseManager from './src/utils/database.mjs';

async function testDatabase() {
    try {
        console.log('🧪 Testing database manager...');

        // Test getKnex method
        console.log('🔍 Testing getKnex method...');
        const knex = await databaseManager.getKnex();
        console.log('✅ getKnex method works!');

        // Test database connection
        console.log('🔍 Testing database connection...');
        await knex.raw('SELECT 1');
        console.log('✅ Database connection successful!');

        // Test users table
        console.log('🔍 Testing users table...');
        const users = await knex('users').select('id', 'name', 'email').limit(5);
        console.log('✅ Users table accessible!');
        console.log('📋 Found users:', users.length);

        console.log('🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('🔍 Error details:', error.stack);
    } finally {
        await databaseManager.disconnect();
        process.exit(0);
    }
}

testDatabase(); 