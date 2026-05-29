const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ParameterMetode = sequelize.define('parameter_metode', {
    id_metode_parameter: {
        type: DataTypes.STRING(6),
        primaryKey: true
    },
    id_parameter: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    id_metode: {
        type: DataTypes.STRING(4),
        allowNull: false
    },
    tarif: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0
    },
    acuan_metode: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_terakreditasi: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0
    },
    is_subkontrak: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['id_metode_parameter', 'id_parameter'],
            name: 'uq_parameter_metode_idparam'
        },
        {
            unique: true,
            fields: ['id_parameter', 'id_metode', 'is_subkontrak'],
            name: 'uq_parameter_metode_pair_source'
        }
    ]
});

module.exports = ParameterMetode;
