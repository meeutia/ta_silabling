const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PktBmParam extends Model {
  static associate(models) {
    PktBmParam.belongsTo(models.RegBm, { foreignKey: 'id_reg_bm' });
    PktBmParam.belongsTo(models.JenisSampel, { foreignKey: 'id_jenis_sampel' });
    PktBmParam.belongsTo(models.Parameter, { foreignKey: 'id_parameter' });
    PktBmParam.belongsTo(models.Satuan, { foreignKey: 'id_satuan' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

PktBmParam.init({
    id_reg_bm: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    id_jenis_sampel: {
        type: DataTypes.STRING(4),
        primaryKey: true,
        allowNull: false
    },
    id_parameter: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        allowNull: false
    },
    id_satuan: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    ket_bm: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
  sequelize,
  modelName: 'pkt_bm_param',
tableName: 'pkt_bm_param',
    timestamps: false,
});

module.exports = PktBmParam;
