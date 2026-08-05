const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const SUBCONTRACT_REQUEST_STATUS = require('../constants/subcontract-request-status');

class PermintaanSubkontrak extends Model {
    static associate(models) {
        PermintaanSubkontrak.belongsTo(models.Fppl, {
            foreignKey: 'id_registrasi',
            as: 'fppl',
        });

        PermintaanSubkontrak.belongsTo(models.FpplParameterMetode, {
            foreignKey: 'id_fppl_parameter_metode',
            as: 'fppl_parameter_metode',
        });

        PermintaanSubkontrak.belongsTo(models.Parameter, {
            foreignKey: 'id_parameter',
            as: 'parameter',
        });

    }

    isPending() {
        return this.status_permintaan === SUBCONTRACT_REQUEST_STATUS.PENDING_ADMIN;
    }

    isSelesai() {
        return this.status_permintaan === SUBCONTRACT_REQUEST_STATUS.SELESAI;
    }

    isDitolak() {
        return this.status_permintaan === SUBCONTRACT_REQUEST_STATUS.DITOLAK;
    }

    canBeProcessed() {
        return this.isPending();
    }
}

PermintaanSubkontrak.init({
    id_permintaan_subkontrak: {
        type: DataTypes.STRING(16),
        primaryKey: true,
        allowNull: false
    },
    id_registrasi: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    id_fppl_parameter_metode: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    id_parameter: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    status_permintaan: {
        type: DataTypes.ENUM(
            SUBCONTRACT_REQUEST_STATUS.PENDING_ADMIN,
            SUBCONTRACT_REQUEST_STATUS.SELESAI,
            SUBCONTRACT_REQUEST_STATUS.DITOLAK
        ),
        allowNull: false,
        defaultValue: SUBCONTRACT_REQUEST_STATUS.PENDING_ADMIN
    },
    diajukan_pada: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    diproses_pada: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'permintaan_subkontrak',
    tableName: 'permintaan_subkontrak',
    timestamps: false
});

module.exports = PermintaanSubkontrak;
