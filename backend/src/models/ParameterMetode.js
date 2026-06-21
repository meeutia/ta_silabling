const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ParameterMetode extends Model {
  static associate(models) {
    ParameterMetode.belongsTo(models.Parameter, { foreignKey: 'id_parameter' });
    ParameterMetode.belongsTo(models.Metode, { foreignKey: 'id_metode' });
    ParameterMetode.hasMany(models.FpplParameterMetode, { foreignKey: 'id_metode_parameter' });
    ParameterMetode.hasMany(models.PenugasanDetail, {foreignKey: 'id_metode_parameter',});
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

  isSubcontract() {
    return this.is_subkontrak === true || this.is_subkontrak === 1;
  }

  isAccredited() {
    return this.is_terakreditasi === true || this.is_terakreditasi === 1;
  }
}

ParameterMetode.init({
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
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
  sequelize,
  modelName: 'parameter_metode',
indexes: [
        {
            fields: ['id_metode_parameter', 'id_parameter'],
            name: 'idx_parameter_metode_idparam'
        },
        {
            unique: true,
            fields: ['id_parameter', 'id_metode', 'acuan_metode', 'is_subkontrak'],
            name: 'uq_parameter_metode_variant'
        }
    ]
});

module.exports = ParameterMetode;
