const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PktBm extends Model {
  static associate(models) {
    PktBm.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm' });
    PktBm.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel' });
    PktBm.belongsTo(models.Klasifikasi, { foreignKey: 'id_klasifikasi' });
    PktBm.hasMany(models.PktBmNilai, { foreignKey: 'id_pkt_bm' });
    PktBm.hasMany(models.Lhu, { foreignKey: 'id_pkt_bm' });
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

PktBm.init({
    id_pkt_bm: {
        type: DataTypes.STRING(8),
        primaryKey: true
    },
    id_reg_bm: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        allowNull: false
    },
    id_klasifikasi: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    }
}, {
  sequelize,
  modelName: 'pkt_bm',
tableName: 'pkt_bm',
    timestamps: false,
});

module.exports = PktBm;
