const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
require("../config/passport")(passport);
const User = require("../models").User;
const { generateRandomCode } = require("../utils/random");

const sendEmail = async (email, code) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: email, // Change to your recipient
    from: "andrew.burns@uconn.edu", // Change to your verified sender
    subject: "Your login code for BlockSend",
    text: `Your login code is ${code}`,
  };
  await sgMail.send(msg);
};
router.post("/code", async function (req, res) {
  const { email } = req.body;
  const doesUserExist = await User.findOne({
    where: {
      email,
    },
  });
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
    await doesUserExist.update({ verifyCode: newCode });
    await sendEmail(email, newCode);
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
