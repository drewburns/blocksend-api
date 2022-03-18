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
      amount: DataTypes.FLOAT,
      link: DataTypes.STRING,
      paymentId: DataTypes.STRING,
      redeemed: DataTypes.BOOLEAN,
      senderName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Transfer",
    }
  );
  return Transfer;
};
