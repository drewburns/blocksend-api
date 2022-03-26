var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const Account = require("../models").Account;
const User = require("../models").User;
const { authenticateAPIRequest } = require("../middleware/auth");
const { guidGenerator } = require("../utils/random");

router.get("/health", async function (req, res, next) {
  res.json("OK");
});

// create account - for internal use for now
router.post("/account", async function (req, res, next) {
  res.json("OK");
});

// create access token
router.post("/auth", async function (req, res, next) {
  const { secretKey, id } = req.body;

  const doesAccountExist = await Account.findOne({
    where: { secretKey, id },
  });
  if (!doesAccountExist) {
    res.status(401).json({ error: "Wrong key" });
    return;
  }
  var token = jwt.sign(
    JSON.parse(JSON.stringify(doesUserExist)),
    process.env.JWT_KEY,
    { expiresIn: 60 * 10 }
  );
  res.json({ token });
});

// upsert a user based on email/external ID and
router.post("/user", authenticateAPIRequest, async function (req, res, next) {
  const { email, externalId, userName } = req.body;
  var user = await User.findOne({
    where: { [Op.or]: [{ email }, { externalId }] },
  });
  if (!user) {
    user = await User.create({ name: userName, email, exeternalId });
  } else {
    await user.update({
      ...(email && { email }),
      ...(externalId && { externalId }),
      ...(userName && { name: userName }),
    });
  }
  //   delete user.dataValues["verifyCode"];

  res.json(user);
});

// create a transfer for a user from the account
router.post("/pay", authenticateAPIRequest, async function (req, res, next) {
  const { blockSendUserId, externalId, email, amount } = req.body;
  var user = await User.findOne({
    where: { [Op.or]: [{ email }, { externalId }, { id: blockSendUserId }] },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newTransfer = await Transfer.create({
    userId: user.id,
    amount,
    accountId: req.account.id,
    link: guidGenerator(),
  });
  const subject = `${req.account.companyName} just sent you $${amount} of crypto on BlockSend`;
  const body = `Your friend ${req.account.companyName} just sent you $${amount} of crypto. Log in to pick the coins you want! https://sandbox.blocksend.co/redeem/${newTransfer.link}`;
  await sendEmail(user.email, null, subject, body);
  res.json({ transfer: newTransfer });
});

module.exports = router;
