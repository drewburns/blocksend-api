var express = require("express");
var router = express.Router();
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const Account = require("../models").Account;
const CoinTransaction = require("../models").CoinTransaction;
const CoinHolding = require("../models").CoinHolding;
const {
  authenticateJWT,
  authenticateAccountJWT,
} = require("../middleware/auth");
const axios = require("axios");
const { guidGenerator, generateRandomCode } = require("../utils/random");

const sendEmail = async (
  email,
  code,
  subject = "Your login code for BlockSend",
  text = `Your login code is ${code}`
) => {
  console.log("GOIGN TO SEND MESSAGE", email);
  if (isValidPhone(email)) {
    console.log("sending phone text");
    const number = "9105438103";
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const client = require("twilio")(sid, token);
    await client.messages.create({
      body: `${text}`,
      from: number,
      to: email,
    });
    return;
  }

  if (!validateEmail(email)) {
    console.log("not even a valid email");
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

router.post("/create", authenticateAccountJWT, async function (req, res, next) {
  var { amount, paymentId, email, receiverName } = req.body;
  amount = parseFloat(amount).toFixed(2) * 100;
  var doesUserExist = await User.findOne({ where: { email } });
  if (!doesUserExist) {
    doesUserExist = await User.create({ email, name: receiverName });
  }
  const acc = await Account.findOne({ where: { id: req.account.id } });

  if (acc.balance < amount) {
    res.status(500).json("NOT ENOUGH MONEY");
    return;
  }
  const newTransfer = await Transfer.create({
    userId: doesUserExist.id,
    accountId: acc.id,
    amount,
    senderName: req.account.companyName,
    paymentId: paymentId || "",
    link: guidGenerator(),
  });

  const usdAmount = (amount / 100).toFixed(2);
  const subject = `${req.account.companyName} just sent you $${usdAmount} on BlockSend`;
  const body = `${req.account.companyName} just sent you $${usdAmount}. Log in to pick the coins you want! https://blocksend.co/redeem/${newTransfer.link}`;
  await sendEmail(doesUserExist.email, null, subject, body);

  await acc.update({ balance: acc.balance - amount });
  res.json(newTransfer);
});

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function isValidPhone(p) {
  var phoneRe = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  var digits = p.replace(/\D/g, "");
  return phoneRe.test(digits);
}
router.post("/mockEmail", async function (req, res, next) {
  const allowedCoins = ["btc", "eth", "sol", "doge", "usdc"];
  var { coins, email } = req.body;

  var doesUserExist = await User.findOne({ where: { email } });
  if (!doesUserExist) {
    doesUserExist = await User.create({ email, name: email });
  }
  var coinString = "";
  var total = 120 * 100;

  if (Object.entries(coins).length === 0) {
    coins = { usdc: 120 * 100 };
  }
  for (const [key, value] of Object.entries(coins)) {
    const amountUSD = (value / 100).toFixed(2);
    console.log("amountUSD:", amountUSD, value, key);
    coinString += ` $${amountUSD} of ${key.toUpperCase()}.`;
    const coinAmount = await getCoinAmount(amountUSD, key);
    await createOrUpdateHolding(key, coinAmount, doesUserExist.id);
  }

  console.log("coin string:", coinString);
  const body = `Confirmation payout of $${120} from BlockSend. You have been paid: ${coinString} View your holdings in your wallet here: https://sandbox.blocksend.co/wallet`;

  await sendEmail(email, null, `Confirmation payout from BlockSend.`, body);

  console.log("coins: ", coins);
  res.json("OK");
});

router.get("/find/:transferLink", async function (req, res, next) {
  const transferLink = req.params.transferLink;
  const transfer = await Transfer.findOne({ where: { link: transferLink } });

  const account = await Account.findByPk(transfer.accountId);
  console.log("ACCOUNT: ", account);
  if (!transfer) {
    res.status(500).json({ error: "not found" });
    return;
  }

  if (req.user && transfer.userId !== req.user.id) {
    res.status(500).json({ error: "wrong user" });
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
  console.log("USD AMOUNT: ", usdAmount);
  return (parseFloat(usdAmount) / parseFloat(price)).toFixed(decimals[ticker]);
};
const createOrUpdateHolding = async (ticker, amount, userId) => {
  console.log("HERE SAVING", ticker, amount, userId);
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
    "8607346043",
    null,
    "Withdraw request for Blocksend",
    `User: ${req.user.email} requested ${amount} of ${ticker} to be sent to ${address}`
  );
  await sendEmail(
    "2183480139",
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
    const transfer = await Transfer.findOne({
      where: { link: req.params.transferLink },
    });
    if (!transfer || transfer.redeemedAt || transfer.userId !== req.user.id) {
      res.status(500).json({ error: "not found" });
      return;
    }

    let runningTotal = 0;
    console.log("coins: ", coins);
    for (const [key, value] of Object.entries(coins)) {
      const ticker = key;
      const centsUsd = parseInt(value);
      const amountUSD = (value / 100).toFixed(2);
      if (!allowedCoins.includes(ticker)) {
        console.log("wrong ticker", ticker);
        res.status(500).json({ error: "error" });
        return;
      }
      runningTotal += centsUsd;
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
        dollarAmount: centsUsd,
        coinAmount: coinAmount,
        coinTicker: ticker,
      });

      console.log("COIN AMOUNT: ", coinAmount);
      await createOrUpdateHolding(ticker, coinAmount, req.user.id);
    }
    // save splits to their wallet!
    await transfer.update({ redeemedAt: new Date() });

    res.json("OK");
  }
);

// jenky
router.post("/claim/", authenticateJWT, async function (req, res, next) {
  // 1. get our self funded account
  // 2. get the user
  // 3. see if that user already has a transfer from this account
  // 4. if not, send them $5

  const account = await Account.findOne(process.env.BLOCKSEND_ACCOUNT_ID);
  const transfer = await Transfer.findOne({
    where: { accountId: account.id, userId: req.user.id },
  });
  if (transfer) {
    res.status(500).json({ error: "Already redeemded" });
    return;
  }

  const amount = 1000;
  const newTransfer = await Transfer.create({
    userId: req.user.id,
    amount,
    accountId: account.id,
    link: guidGenerator(),
  });

  const dollarAmount = (amount / 100).toFixed(2);
  const subject = `${account.companyName} just sent you $${dollarAmount} on BlockSend`;
  const body = `${dollarAmount} just paid you $${dollarAmount}. Log in to pick the coins you want! https://sandbox.blocksend.co/redeem/${newTransfer.link}`;
  await sendEmail(req.user.email, null, subject, body);
  account.update({ balance: acc.balance - amount });
  newTransfer.dataValues.link = `https://sandbox.blocksend.co/redeem/${newTransfer.link}`;

  res.json(newTransfer);
});

module.exports = router;
