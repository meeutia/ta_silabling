const RequestService = require('./src/services/request/request.service');

async function run() {
  try {
    const detail = await RequestService.detailRequest('REG-002');
    console.log(JSON.stringify(detail, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

run();
