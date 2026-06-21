const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PktBmNilai extends Model {
  static associate(models) {
    PktBmNilai.belongsTo(models.PktBm, { foreignKey: 'id_pkt_bm' });
    PktBmNilai.belongsTo(models.Parameter, { foreignKey: 'id_parameter' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

PktBmNilai.init({
  id_pkt_bm: {
    type: DataTypes.STRING(8),
    primaryKey: true,
    allowNull: false,
  },
  id_parameter: {
    type: DataTypes.STRING(6),
    primaryKey: true,
    allowNull: false,
  },
  nilai_bm: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'pkt_bm_nilai',
tableName: 'pkt_bm_nilai',
  timestamps: false,
});

module.exports = PktBmNilai;
