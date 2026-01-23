export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const redisUrl = process.env.REDIS_URL;
        console.log('----------------------------------------');
        console.log('       Atlantis System Status           ');
        console.log('----------------------------------------');

        if (redisUrl) {
            // Mask credentials if present
            const maskedUrl = redisUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
            console.log(`✓ Redis Configured: ${maskedUrl}`);
            console.log('  Cache Backend: Redis');
        } else {
            console.log('ℹ Redis Not Configured');
            console.log('  Cache Backend: In-Memory (Fallback)');
            console.log('  Note: Set REDIS_URL to enable persistent caching');
        }
        console.log('----------------------------------------');
    }
}
