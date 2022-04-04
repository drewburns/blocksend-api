"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transfer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Transfer.init(
    {
      userId: DataTypes.INTEGER,
      accountId: DataTypes.INTEGER,
      amount: DataTypes.INTEGER,
      link: DataTypes.STRING,
      paymentId: DataTypes.STRING,
      redeemedAt: DataTypes.DATE,
      paidBySender: DataTypes.BOOLEAN
    },
    {
      sequelize,
      modelName: "Transfer",
    }
  );
  return Transfer;
};
