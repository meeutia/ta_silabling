const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PenugasanDetail extends Model {
  static associate(models) {
    PenugasanDetail.belongsTo(models.ParameterMetode, {foreignKey: 'id_metode_parameter',});
    PenugasanDetail.belongsTo(models.Penugasan, { foreignKey: 'id_penugasan' });
    PenugasanDetail.hasMany(models.PenugasanItem, { foreignKey: 'id_penugasan_detail' });
    PenugasanDetail.hasOne(models.Lka, { foreignKey: 'id_penugasan_detail' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isStatus(status) {
    return this.status_detail === status;
  }

  isDraft() {
    return this.isStatus('Draft');
  }

  isOverdue(referenceDate = new Date()) {
    return Boolean(this.tanggal_tenggat) && new Date(this.tanggal_tenggat) < referenceDate;
  }
}

PenugasanDetail.init({
    id_penugasan_detail: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_penugasan: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    id_metode_parameter: {
        type: DataTypes.STRING(6),
        allowNull: false,
    },
    status_detail: {
        type: DataTypes.ENUM(
            'Draft',
            'Ditugaskan',
            'Sedang Dikerjakan',
            'Worksheet Terkirim',
            'Perlu Revisi',
            'Disetujui',
            'Selesai'
        ),
        allowNull: false,
        defaultValue: 'Draft'
    },
    tanggal_tenggat: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    catatan_detail: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
  sequelize,
  modelName: 'penugasan_detail',
tableName: 'penugasan_detail'
});

module.exports = PenugasanDetail;
