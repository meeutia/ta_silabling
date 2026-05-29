const http = require('http');

const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const healthUrl = new URL('/health', baseUrl);

const request = http.request(healthUrl, { method: 'GET', timeout: 5000 }, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`Smoke test gagal: GET ${healthUrl.href} mengembalikan HTTP ${res.statusCode}.`);
      console.error(body);
      process.exit(1);
    }

    try {
      const json = JSON.parse(body);
      if (!json.success) throw new Error('Response health tidak berisi success=true.');
      console.log(`Smoke test API aman: ${healthUrl.href}`);
    } catch (error) {
      console.error(`Smoke test gagal: response /health tidak valid JSON sukses. ${error.message}`);
      console.error(body);
      process.exit(1);
    }
  });
});

request.on('timeout', () => {
  request.destroy(new Error('timeout'));
});

request.on('error', (error) => {
  console.error(`Smoke test gagal: tidak bisa mengakses ${healthUrl.href}.`);
  console.error(`Pastikan backend sedang berjalan dengan npm run dev. Detail: ${error.message}`);
  process.exit(1);
});

request.end();
