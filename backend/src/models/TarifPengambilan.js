const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TarifPengambilan = sequelize.define('tarif_pengambilan', {
    id_tarif_pengambilan: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    keterangan_jarak: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tarif: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    }
});

module.exports = TarifPengambilan;
