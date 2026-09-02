const url = process.env.CCMS_API_URL || 'http://localhost:8787/api/health';
const deadline = Date.now() + 15000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(url);
    if (response.ok) process.exit(0);
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
console.error(`API did not become ready: ${url}`);
process.exit(1);
