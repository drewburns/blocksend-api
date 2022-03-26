'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CoinTransaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CoinTransaction.init({
    userId: DataTypes.INTEGER,
    transferId: DataTypes.INTEGER,
    dollarAmount: DataTypes.FLOAT,
    coinAmount: DataTypes.FLOAT,
    coinTicker: DataTypes.STRING,
    type: DataTypes.STRING,

  }, {
    sequelize,
    modelName: 'CoinTransaction',
  });
  return CoinTransaction;
};