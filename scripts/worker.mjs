import { closeDatabase, databaseStatus } from '../server/db.js';
import { processJob, runWorkerOnce } from '../server/worker.js';

if (!databaseStatus().configured) {
  console.error('Worker requires DATABASE_URL');
  process.exitCode = 1;
} else {
  const interval = Number(process.env.JOB_POLL_MS || 1000);
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await closeDatabase(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  console.log(`Northern Star CCMS worker ${process.pid} started; polling every ${interval}ms`);
  while (!stopping) {
    const result = await runWorkerOnce(async job => { console.log(JSON.stringify({ service: 'northern-star-ccms-worker', event: 'job_claimed', workerId: job.workerId, jobId: job.id, type: job.type })); await processJob(job); });
    if (result) console.log(JSON.stringify({ service: 'northern-star-ccms-worker', event: 'job_finished', jobId: result.id, status: result.status }));
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
