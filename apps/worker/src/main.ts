import { Worker } from 'bullmq';

const redis = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const worker = new Worker('jingo-operations', async (job) => {
  if (job.name !== 'diagnostic') throw new Error(`Unsupported job type: ${job.name}`);
  return { status: 'ok', processedAt: new Date().toISOString() };
}, {
  connection: {
    host: redis.hostname, port: Number(redis.port || 6379),
    username: redis.username || undefined, password: redis.password || undefined,
    ...(redis.protocol === 'rediss:' ? { tls: {} } : {})
  }, concurrency: 2
});
worker.on('ready', () => console.log('JinGo worker ready (diagnostic jobs only).'));
worker.on('error', (error) => console.error('Worker error:', error.message));
worker.on('failed', (job, error) => console.error('Job failed:', job?.id, error.message));
const shutdown = async () => { await worker.close(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
