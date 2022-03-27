"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Transfers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      redeemedAt: {
        type: Sequelize.DATE,
        default: false,
      },
      link: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      paidBySender: {
        type: Sequelize.BOOLEAN,
        default: false,
      },
      paymentId: {
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
    await queryInterface.dropTable("Transfers");
  },
};
