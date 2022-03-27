const jwt = require("jsonwebtoken");
const Account = require("../models").Account;

const authenticateAPIRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_KEY, (err, account) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.account = account;
      next();
    });
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
