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
        allowNull: false,
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      transferId: {
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.STRING,
        default: "IN",
      },
      dollarAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      coinAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      coinTicker: {
        type: Sequelize.STRING,
        allowNull: false,
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
