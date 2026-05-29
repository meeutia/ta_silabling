const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('user', {
  nik: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    allowNull: false,
  },
  id_role: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  refresh_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  refresh_token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
  },
  reset_password_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  reset_password_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'user',
  timestamps: false,
});

module.exports = User;
