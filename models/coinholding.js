'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CoinHolding extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CoinHolding.init({
    userId: DataTypes.INTEGER,
    ticker: DataTypes.STRING,
    amount: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'CoinHolding',
  });
  return CoinHolding;
};