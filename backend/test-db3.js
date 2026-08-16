const { FpplSampel } = require('./src/models/Associations');

async function run() {
    try {
        let idFpplSampel = 'FSM-PNGMN';
        await FpplSampel.destroy({ where: { id_fppl_sampel: idFpplSampel } });
        console.log("SUCCESS");
    } catch (err) {
        console.error("ERROR:");
        console.error(err.message);
        console.error(err);
    }
    process.exit(0);
}

run();
