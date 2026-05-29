const {
  Lka,
  LkaHasil,
} = require('../../models/Associations');
const {
  getPlain,
  pickObject,
} = require('./assignment-object.helper');

async function getLkaResultRowsForSample(noSampel, transaction = null) {
  const sampleNo = String(noSampel || '').trim();

  if (!sampleNo) {
    throw new Error('Nomor sampel wajib dikirim.');
  }

  const rows = await LkaHasil.findAll({
    where: { no_sampel: sampleNo },
    include: [
      {
        model: Lka,
        required: false,
        attributes: ['kode_lka', 'id_penugasan_detail', 'status_lka'],
      },
    ],
    transaction,
  });

  return rows
    .map((instance) => {
      const plain = getPlain(instance);
      const lka = pickObject(plain, ['lka', 'Lka']) || {};

      return {
        kode_lka: lka.kode_lka || plain.kode_lka || null,
        id_penugasan_detail: lka.id_penugasan_detail || null,
        status_lka: lka.status_lka || null,
      };
    })
    .filter((row) => row.kode_lka || row.id_penugasan_detail);
}

module.exports = {
  getLkaResultRowsForSample,
};
