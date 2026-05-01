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
    } else if (process.env.NODE_ENV === 'production') {
      console.log('ℹ Redis Not Configured (Production)');
      console.log('  Cache Backend: DISABLED (Safety)');
      console.log(
        '  Note: Set REDIS_URL to enable persistent caching and sharing between instances'
      );
    } else {
      console.log('ℹ Redis Not Configured (Development)');
      console.log('  Cache Backend: In-Memory (Fallback)');
      console.log('  Note: Set REDIS_URL to enable persistent caching');
    }
    console.log('----------------------------------------');
  }
}
