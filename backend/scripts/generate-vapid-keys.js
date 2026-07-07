let webPush = null;
try {
  // Jalankan setelah dependency di-install: npm install
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  webPush = require('web-push');
} catch (error) {
  console.error('Dependency web-push belum terinstall. Jalankan: npm install');
  process.exit(1);
}

const keys = webPush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@silabling.local');
console.log('ENABLE_PUSH_NOTIFICATIONS=true');
