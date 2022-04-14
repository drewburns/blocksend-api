var express = require("express");
const { authenticateAccountJWT } = require("../middleware/auth");
const Transfer = require("../models").Transfer;
const User = require("../models").User;
const Account = require("../models").Account;
var router = express.Router();

router.get("/", authenticateAccountJWT, async function (req, res, next) {
  const acc = await Account.findOne({ where: { id: req.account.id } });
  if (!acc) {
    res.status(401).json("BAD");
    return;
  }

  acc.dataValues.secretKey = "";
  acc.dataValues.verifyCode = "";
  res.json(acc);
});

router.get(
  "/transfers",
  authenticateAccountJWT,
  async function (req, res, next) {
    const acc = await Account.findOne({ where: { id: req.account.id } });
    if (!acc) {
      res.status(401).json("BAD");
      return;
    }

    const transfers = await Transfer.findAll({
      where: { accountId: acc.id },
      include: User,
      order: [["createdAt", "DESC"]],
    });
    res.json(transfers);
  }
);

module.exports = router;
