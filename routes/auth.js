const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
require("../config/passport")(passport);
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const { generateRandomCode } = require("../utils/random");

const sendEmail = async (email, code) => {
  console.log("sending email: ", email);
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email, 
    from: "andrew.burns@uconn.edu", 
    subject: "Your login code for BlockSend",
    text: `Your login code is ${code}`,
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
