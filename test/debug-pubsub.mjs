import { createPgbloom } from '../dist/esm/index.js';
const client = await createPgbloom(process.env.DATABASE_URL, { cleanupInterval: false });
const received = [];
const unsubscribe = await client.subscribe('test-debug-channel-2', (ch, payload) => {
  console.log('Received:', ch, JSON.stringify(payload));
  received.push({ ch, payload });
});
console.log('Subscribed');
await new Promise(r => setTimeout(r, 500));
await client.publish('test-debug-channel-2', { test: true });
console.log('Published');
await new Promise(r => setTimeout(r, 1000));
console.log('Total received:', received.length);
unsubscribe();
await client.close();