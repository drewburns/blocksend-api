var express = require("express");
var router = express.Router();
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const Account = require("../models").Account;
const CoinTransaction = require("../models").CoinTransaction;
const CoinHolding = require("../models").CoinHolding;
const { authenticateJWT } = require("../middleware/auth");
const axios = require("axios");
const { guidGenerator, generateRandomCode } = require("../utils/random");

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

// router.post("/create", async function (req, res, next) {
//   const { amount, paymentId, email, senderName } = req.body;
//   console.log("user: ", req.user);
//   var user = null;
//   const foundUser = await User.findOne({ where: { email } });
//   if (!foundUser) {
//     user = await User.create({ email });
//   } else {
//     user = foundUser;
//   }

//   const newTransfer = await Transfer.create({
//     userId: user.id,
//     amount,
//     senderName,
//     paymentId: paymentId || "",
//     link: guidGenerator(),
//   });
//   const subject = `${senderName} just sent you $${amount} of crypto on BlockSend`;
//   const body = `Your friend ${senderName} just sent you $${amount} of crypto. Log in to pick the coins you want! https://blocksend.co/redeem/${newTransfer.link}`;
//   await sendEmail(user.email, null, subject, body);
//   res.json(newTransfer);
// });

router.get("/find/:transferLink", async function (req, res, next) {
  const transferLink = req.params.transferLink;
  const transfer = await Transfer.findOne({ where: { link: transferLink } });

  const account = await Account.findByPk(transfer.accountId);
  if (!transfer) {
    res.status(500).json({ error: "not found" });
    return;
  }

  if (req.user && transfer.userId !== req.user.id) {
    res.status(500).json({ error: "wrong user" });
    return;
  }

  if (!req.user) {
    const newCode = generateRandomCode(6);
    const user = await User.findByPk(transfer.userId);
    await user.update({ verifyCode: newCode });
    await sendEmail(user.email, newCode);
    console.log("USER VERIFY CODE: ", newCode);
    res.json({ transfer, user: req.user || null });
    return;
  }

  res.json({
    senderName: account.companyName,
    transfer,
    user: req.user || null,
  });
});

const getCoinPrice = async (ticker) => {
  const coinMapping = {
    btc: "bitcoin",
    eth: "ethereum",
    doge: "dogecoin",
    sol: "solana",
  };
  if (ticker === "usdc") {
    return 1.0;
  }
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinMapping[ticker]}`
  );
  console.log("coin price: ", ticker, res.data[0].current_price);
  return res.data[0].current_price;
};

const getCoinAmount = async (usdAmount, ticker) => {
  const price = await getCoinPrice(ticker);
  const decimals = { sol: 9, btc: 8, eth: 18, doge: 8 };
  return (parseFloat(usdAmount) / parseFloat(price)).toFixed(decimals[ticker]);
};
const createOrUpdateHolding = async (ticker, amount, userId) => {
  const holding = await CoinHolding.findOne({ where: { userId, ticker } });
  if (!holding) {
    await CoinHolding.create({ ticker, userId, amount });
  } else {
    await holding.update({ amount: holding.amount + parseFloat(amount) });
  }
};

router.post("/withdraw", authenticateJWT, async function (req, res, next) {
  const { ticker, amount, address } = req.body;
  await sendEmail(
    "drewburnsbab@gmail.com",
    null,
    "Withdraw request for Blocksend",
    `User: ${req.user.email} requested ${amount} of ${ticker} to be sent to ${address}`
  );
  await sendEmail(
    req.user.email,
    null,
    "Withdraw request receieved for BlockSend",
    `You requested ${amount} of ${ticker} to be sent to ${address}. We will email you when the request is fufilled. Please email us if you have any questions or if you need to change address.`
  );
  res.json("OK");
});

router.post(
  "/confirm/:transferLink",
  authenticateJWT,
  async function (req, res, next) {
    console.log("ABOUT TO CONFIRM!!!");
    const allowedCoins = ["btc", "eth", "sol", "doge", "usdc"];
    const { coins } = req.body;
    console.log("body: ", req.body);
    const transfer = await Transfer.findOne({
      where: { link: req.params.transferLink },
    });
    if (!transfer || transfer.redeemedAt || transfer.userId !== req.user.id) {
      res.status(500).json({ error: "not found" });
      return;
    }

    let runningTotal = 0.0;
    console.log("coins: ", coins);
    for (const [key, value] of Object.entries(coins)) {
      const ticker = key;
      const amountUSD = parseFloat(value);
      if (!allowedCoins.includes(ticker)) {
        console.log("wrong ticker", ticker);
        res.status(500).json({ error: "error" });
        return;
      }
      runningTotal += amountUSD;
      console.log("running total: ", runningTotal, transfer.amount);
      if (runningTotal > transfer.amount) {
        console.log("too much");
        res.status(500).json({ error: "error" });
        return;
      }

      const coinAmount = await getCoinAmount(amountUSD, ticker);
      console.log("coin holding insert: ", coinAmount, amountUSD, ticker);
      console.log("ACCOUNT:", transfer.accountId);
      await CoinTransaction.create({
        userId: req.user.id,
        transferId: req.params.transerId,
        dollarAmount: amountUSD,
        coinAmount: coinAmount,
        coinTicker: ticker,
      });

      await createOrUpdateHolding(ticker, coinAmount, req.user.id);
    }
    // save splits to their wallet!
    await transfer.update({ redeemedAt: new Date() });

    res.json("OK");
  }
);

module.exports = router;
