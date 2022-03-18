const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
require("../config/passport")(passport);
const User = require("../models").User;

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
      res.json({ token, user: doesUserExist });
    } else {
      res.status(403).json("Wrong login");
    }
  } else {
    res.status(403).json("Wrong login");
  }
});

module.exports = router;
