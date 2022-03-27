var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");
const Account = require("../models").Account;
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const { authenticateAPIRequest } = require("../middleware/auth");
const { guidGenerator } = require("../utils/random");
const crypto = require("crypto");
const { Op } = require("sequelize");

router.get("/health", async function (req, res, next) {
  res.json("OK");
});

// create account - for internal use for now
router.post("/account", async function (req, res, next) {
  const { password, email, companyName } = req.body;
  if (password !== "8885779133a2kakdk2p1ppa") {
    res.status(401).json("BAD");
    return;
  }
  const doesAccountExist = await Account.findOne({
    where: { email },
  });
  if (doesAccountExist) {
    res.status(500).json("Exists");
    return;
  }

  const secretKey = crypto.randomBytes(16).toString("hex");
  const acc = await Account.create({ email, companyName, secretKey });
  res.json({ account: acc });
});

// create access token
router.post("/auth", async function (req, res, next) {
  const { secretKey, id } = req.body;
  if (!secretKey || !id) {
    res.status(400).json("Need a secret key and id");
    return;
  }

  const doesAccountExist = await Account.findOne({
    where: { secretKey, id },
  });
  if (!doesAccountExist) {
    res.status(401).json({ error: "Wrong key" });
    return;
  }
  var token = jwt.sign(
    JSON.parse(JSON.stringify(doesAccountExist)),
    process.env.JWT_KEY,
    { expiresIn: 60 * 30 }
  );
  res.json({ token });
});

// upsert a user based on email/external ID and
router.post("/user", authenticateAPIRequest, async function (req, res, next) {
  console.log("upserting user");
  const { email, userName } = req.body;
  if (!email || !userName) {
    res.status(400).json("Need email and name");
    return;
  }

  var user = await User.findOne({
    where: { email },
  });
  if (!user) {
    user = await User.create({ name: userName, email });
  } else {
    await user.update({
      ...(email && { email }),
      // ...(externalId && { externalId }),
      ...(userName && { name: userName }),
    });
  }
  delete user.dataValues["verifyCode"];

  res.json(user);
});

// TODO: abstract out!
const sendEmail = async (
  email,
  code,
  subject = "Your login code for BlockSend",
  text = `Your login code is ${code}`
) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email, // Change to your recipient
    from: "andrew.burns@uconn.edu", // Change to your verified sender
    subject: subject,
    text: text,
  };
  await sgMail.send(msg);
};

// create a transfer for a user from the account
router.post("/pay", authenticateAPIRequest, async function (req, res, next) {
  var { blockSendUserId, email, amount } = req.body;
  amount = parseFloat(amount).toFixed(2);
  var user = await User.findOne({
    where: {
      [Op.or]: [{ email: email || "" }, { id: blockSendUserId || null }],
    },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const newTransfer = await Transfer.create({
      userId: user.id,
      amount,
      accountId: req.account.id,
      link: guidGenerator(),
    });
    const subject = `${req.account.companyName} just sent you $${amount} of crypto on BlockSend`;
    const body = `${req.account.companyName} just paid you $${amount}. Log in to pick the coins you want! https://sandbox.blocksend.co/redeem/${newTransfer.link}`;
    await sendEmail(user.email, null, subject, body);
    newTransfer.dataValues.link = `https://sandbox.blocksend.co/redeem/${newTransfer.link}`;
    res.json({ transfer: newTransfer });
  } catch (err) {
    console.log("error:", err);
    res.status(500).json("internal error");
  }
});

module.exports = router;
