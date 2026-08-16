const fs = require('fs');
const { RequestService } = require('./src/services/request/request.service');

async function run() {
  try {
    const detail = await RequestService.detailRequest('REG-002');
    const fpplSampels = detail.fppl_sampels || detail.FpplSampels;
    console.log(fpplSampels.map(fs => ({
      id: fs.id_jenis_sampel || fs.idJenisSampel,
      params: fs.fpplParameterMetodes?.length || fs.fppl_parameter_metodes?.length || fs.FpplParameterMetodes?.length
    })));
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

run();
