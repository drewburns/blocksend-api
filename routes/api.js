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
const bcrypt = require("bcrypt");

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
  const hashedKey = bcrypt.hashSync(secretKey, 10);
  const acc = await Account.create({
    email,
    companyName,
    secretKey: hashedKey,
  });
  acc.dataValues.secretKey = secretKey;
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
  if (!email) {
    res.status(400).json("Need email");
    return;
  }

  var user = await User.findOne({
    where: { email },
  });
  if (!user) {
    user = await User.create({ name: userName || email, email });
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

function isValidPhone(p) {
  var phoneRe = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  var digits = p.replace(/\D/g, "");
  return phoneRe.test(digits);
}
// TODO: abstract out!
const sendEmail = async (
  email,
  code,
  subject = "Your login code for BlockSend",
  text = `Your login code is ${code}`
) => {
  if (isValidPhone(email)) {
    const number = "9105438103";
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const client = require("twilio")(sid, token);
    await client.messages.create({
      body: `${subject}. ${text}`,
      from: number,
      to: email,
    });
    return;
  }
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email, // Change to your recipient
    from: "support@blocksend.co", // Change to your verified sender
    subject: subject,
    html: `<html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
      </style>
    </head>
    <body class="bg-light">
      <div class="container">
        <div class="card my-10">
          <div class="card-body">
            <h1 class="h3 mb-2">BlockSend</h1>
            <h2 class="text-teal-700">${text}</h3>
            <hr>
            <p>If you have any problems reach out to help@blocksend.co</p>
        </div>
      </div>
    </body>
  </html>`,
  };
  await sgMail.send(msg);
};

// create a transfer for a user from the account
router.post("/pay", authenticateAPIRequest, async function (req, res, next) {
  var { blockSendUserId, email, amount } = req.body;
  amount = parseInt(amount);
  const acc = await Account.findOne({ where: { id: req.account.id } });
  if (acc.balance < amount) {
    res.status(500).json({
      error: "Insufficient account balance. Please contact to add more.",
    });
    return;
  }
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
    const dollarAmount = (amount / 100).toFixed(2);
    const subject = `${req.account.companyName} just sent you $${dollarAmount} on BlockSend`;
    const body = `${dollarAmount} just paid you $${dollarAmount}. Log in to pick the coins you want! https://app.blocksend.co/redeem/${newTransfer.link}`;
    await sendEmail(user.email, null, subject, body);
    acc.update({ balance: acc.balance - amount });
    newTransfer.dataValues.link = `https://app.blocksend.co/redeem/${newTransfer.link}`;
    res.json({ transfer: newTransfer });
  } catch (err) {
    console.log("error:", err);
    res.status(500).json("internal error");
  }
});

module.exports = router;
