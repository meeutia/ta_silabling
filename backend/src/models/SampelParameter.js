const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SampelParameter = sequelize.define('sampel_parameter', {
    no_sampel: {
        type: DataTypes.STRING(25),
        primaryKey: true
    },
    id_fppl_parameter_metode: {
        type: DataTypes.STRING(20),
        primaryKey: true
    }

});

module.exports = SampelParameter;
