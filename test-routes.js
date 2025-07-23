import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testRoutes() {
    try {
        console.log('🧪 Testing route loading...');

        // Test loading apiRoute
        console.log('📦 Loading apiRoute...');
        const { default: apiRoute } = await import('./src/routes/apiRoute.mjs');
        console.log('✅ apiRoute loaded successfully');

        // Test loading individual endpoints
        console.log('📦 Testing individual endpoint loading...');

        const endpoints = [
            'users',
            'products',
            'shoppingCarts',
            'orders',
            'payments',
            'rights'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`📦 Loading ${endpoint}...`);
                const module = await import(`./src/endpoints/${endpoint}.mjs`);
                console.log(`✅ ${endpoint} loaded successfully`);
            } catch (error) {
                console.error(`❌ Failed to load ${endpoint}:`, error.message);
            }
        }

        console.log('🎉 Route testing completed!');

    } catch (error) {
        console.error('❌ Route testing failed:', error.message);
        console.error('🔍 Error stack:', error.stack);
    }
}

testRoutes(); 