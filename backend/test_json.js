const fs = require('fs');

try {
  let content = fs.readFileSync('detail.json', 'utf16le');
  let firstBrace = content.indexOf('{');
  let jsonString = content.substring(firstBrace);
  let d = JSON.parse(jsonString);
  console.log(JSON.stringify(d.fpplSampels.map(fs => ({
    id: fs.idJenisSampel || fs.id_jenis_sampel,
    params: fs.fpplParameterMetodes?.length || fs.fppl_parameter_metodes?.length || fs.FpplParameterMetodes?.length,
    fpm: (fs.fpplParameterMetodes || []).map(f => f.idFpplParameterMetode || f.id_fppl_parameter_metode)
  })), null, 2));
} catch (err) {
  console.error(err);
}
