const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PktBmKelompok extends Model {
  static associate(models) {
    PktBmKelompok.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm' });
    PktBmKelompok.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }

  isActive() {
    return this.is_active === true || this.is_active === 1;
  }
}

PktBmKelompok.init({
  id_reg_bm: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
  },
  id_jenis_sampel: {
    type: DataTypes.STRING(4),
    primaryKey: true,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  sequelize,
  modelName: 'pkt_bm_kelompok',
tableName: 'pkt_bm_kelompok',
  timestamps: false,
});

module.exports = PktBmKelompok;
