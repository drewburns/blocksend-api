"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CoinTransactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
      },
      transferId: {
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.STRING,
        default: "IN",
      },
      dollarAmount: {
        type: Sequelize.FLOAT,
      },
      coinAmount: {
        type: Sequelize.FLOAT,
      },
      coinTicker: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("CoinTransactions");
  },
};
