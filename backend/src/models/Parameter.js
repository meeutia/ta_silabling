const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Parameter extends Model {
  static associate(models) {
    Parameter.hasMany(models.PktBmParam, { foreignKey: 'id_parameter' });
    Parameter.hasMany(models.PktBmNilai, { foreignKey: 'id_parameter' });
    Parameter.belongsTo(models.KategoriParameter, { foreignKey: 'id_kategori_parameter', as: 'kategori' });
    Parameter.hasMany(models.ParameterMetode, { foreignKey: 'id_parameter' });
    Parameter.hasMany(models.FpplParameterMetode, { foreignKey: 'id_parameter' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

Parameter.init({
    id_parameter: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    id_kategori_parameter: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    // kategori_parameter bukan lagi kolom fisik di tabel parameter.
    // Nilai kategori dibaca dari relasi parameter.id_kategori_parameter -> kategori_parameter.nama_kategori.
    kategori_parameter: {
        type: DataTypes.VIRTUAL,
        get() {
            const kategori = this.getDataValue('kategori') || this.kategori;
            return kategori?.nama_kategori || this.getDataValue('kategori_parameter') || null;
        },
        set(value) {
            this.setDataValue('kategori_parameter', value);
        }
    },
    nama_parameter: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
  sequelize,
  modelName: 'parameter',
});

module.exports = Parameter;
