var express = require("express");
var router = express.Router();

router.get("/health", async function (req, res, next) {
  res.json("OK");
});

// create account - for internal use for now
router.post("/account", async function (req, res, next) {
  res.json("OK");
});

// upsert a user based on email/external ID and
router.post("/user", async function (req, res, next) {
  const { email, externalId, userName } = req.body;
  res.json("OK");
});

// create a transfer for a user from the account
router.post("/pay", async function (req, res, next) {
  const { blockSendUserId, externalId, email, amount,  } = req.body;
  res.json("OK");
});

module.exports = router;
