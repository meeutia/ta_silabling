const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Role extends Model {
  static associate(models) {
    Role.hasMany(models.User, { foreignKey: 'id_role' });
  }

  getPrimaryKeyValue() {
    const primaryKey = this.constructor.primaryKeyAttribute;
    return primaryKey ? this.get(primaryKey) : undefined;
  }

  toPlainObject() {
    return this.get({ plain: true });
  }
}

Role.init({
    id_role: {
        type: DataTypes.STRING(10),
        primaryKey: true
    },
    nama_role: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
  sequelize,
  modelName: 'role',
});

module.exports = Role;
