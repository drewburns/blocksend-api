'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.Transfer, { foreignKey: "userId" });

    }
  }
  User.init({
    email: DataTypes.STRING,
    name: DataTypes.STRING,
    externalId: DataTypes.STRING,
    verifyCode: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};