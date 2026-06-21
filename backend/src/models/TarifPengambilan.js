const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TarifPengambilan extends Model {
  static associate(models) {
    TarifPengambilan.hasMany(models.Fppl, { foreignKey: 'id_tarif_pengambilan' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

TarifPengambilan.init({
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
}, {
  sequelize,
  modelName: 'tarif_pengambilan',
});

module.exports = TarifPengambilan;
