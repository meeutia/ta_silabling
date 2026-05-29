const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('role', {
    id_role: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    nama_role: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
});

module.exports = Role;
