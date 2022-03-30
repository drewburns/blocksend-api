const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
require("../config/passport")(passport);
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const { generateRandomCode } = require("../utils/random");

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function isValidPhone(p) {
  var phoneRe = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  var digits = p.replace(/\D/g, "");
  return phoneRe.test(digits);
}

const sendEmail = async (email, code) => {
  if (isValidPhone(email)) {
    const number = "9105438103";
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const client = require("twilio")(sid, token);
    await client.messages.create({
      body: `Your login code is: ${code}`,
      from: number,
      to: email,
    });
    return;
  }
  console.log("sending email: ", email);
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email,
    from: "support@blocksend.co",
    subject: "Your login code for BlockSend",
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
            <h2 class="text-teal-700">Your login code is ${code}</h3>
            <hr>
            <p>If you have any problems reach out to help@blocksend.co</p>
        </div>
      </div>
    </body>
  </html>`,
  };
  await sgMail.send(msg);
};
router.post("/code", async function (req, res) {
  const { email, transferId } = req.body;

  var doesUserExist = null;
  if (!email && transferId) {
    const transfer = await Transfer.findByPk(transferId);
    doesUserExist = await User.findByPk(transfer.userId);
    if (!doesUserExist) {
      // something went seriously wrong
      res.status(500).json("Something went wrong");
      return;
    }
  } else {
    doesUserExist = await User.findOne({
      where: {
        email,
      },
    });
  }

  console.log("here!", doesUserExist);
  const newCode = generateRandomCode(6);

  if (!doesUserExist) {
    const u = await User.create({
      verifyCode: newCode,
      name: email,
      email,
    });
    await sendEmail(email, newCode);
    res.json({ userId: u.id });
  } else {
    console.log("sending1!", doesUserExist);
    await doesUserExist.update({ verifyCode: newCode });
    await sendEmail(doesUserExist.email, newCode);
    res.json({ userId: doesUserExist.id });
  }
});
router.post("/login", async function (req, res) {
  const { userId, verifyCode } = req.body;

  const doesUserExist = await User.findOne({
    where: {
      id: userId,
    },
  });

  if (doesUserExist) {
    if (doesUserExist.verifyCode === verifyCode) {
      var token = jwt.sign(
        JSON.parse(JSON.stringify(doesUserExist)),
        process.env.JWT_KEY,
        { expiresIn: 86400 * 30 * 30 * 30 }
      );
      await doesUserExist.update({ verifyCode: null });
      res.json({ token, user: doesUserExist });
    } else {
      res.status(403).json("Wrong login");
    }
  } else {
    res.status(403).json("Wrong login");
  }
});

module.exports = router;
