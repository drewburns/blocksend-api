const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Account = require("../models").Account;

const authenticateAPIRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const b64auth = (authHeader || "").split(" ")[1] || "";
    const [id, secret] = Buffer.from(b64auth, "base64").toString().split(":");
    console.log("secret", secret);
    Account.findOne({ where: { id } })
      .then((account) => {
        if (!account) {
          return res.sendStatus(403);
        }
        bcrypt.compare(secret, account.secretKey, function (err, result) {
          if (err || !result) {
            return res.sendStatus(403);
          }
          req.account = account;
          next();
        });
      })
      .catch((err) => {
        return res.sendStatus(403);
      });
    // jwt.verify(token, process.env.JWT_KEY, (err, account) => {
    //   if (err) {
    //   }
    // });
  } else {
    res.sendStatus(401);
  }
};

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

module.exports = { authenticateJWT, authenticateAPIRequest };
