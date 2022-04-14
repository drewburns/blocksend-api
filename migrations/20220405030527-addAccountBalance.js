"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("Accounts", "verifyCode", {
      type: Sequelize.STRING,
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    queryInterface.removeColumn("Accounts", "verifyCode");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
