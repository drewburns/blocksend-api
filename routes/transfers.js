var express = require("express");
var router = express.Router();
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const CoinTransaction = require("../models").CoinTransaction;
const CoinHolding = require("../models").CoinHolding;
const { authenticateJWT } = require("../middleware/auth");
const axios = require("axios");
function guidGenerator() {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4();
}

function generate(n) {
  var add = 1,
    max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

  if (n > max) {
    return generate(max) + generate(n - max);
  }

  max = Math.pow(10, n + add);
  var min = max / 10; // Math.pow(10, n) basically
  var number = Math.floor(Math.random() * (max - min + 1)) + min;

  return ("" + number).substring(add);
}

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
    from: "andrew@getzendent.com", // Change to your verified sender
    subject: "Your login code for BlockSend",
    text: text,
  };
  await sgMail.send(msg);
};

router.post("/create", async function (req, res, next) {
  const { amount, paymentId, email, senderName } = req.body;
  console.log("user: ", req.user);
  var user = null;
  const foundUser = await User.findOne({ where: { email } });
  if (!foundUser) {
    user = await User.create({ email });
  } else {
    user = foundUser;
  }

  const newTransfer = await Transfer.create({
    userId: user.id,
    amount,
    senderName,
    paymentId: paymentId || "",
    link: guidGenerator(),
  });
  const subject = `${senderName} just sent you $${amount} of crypto on BlockSend`;
  const body = `Your friend ${senderName} just sent you $${amount} of crypto. Log in to pick the coins you want! https://blocksend.co/redeem/${newTransfer.link}`;
  await sendEmail(user.email, null, subject, body);
  res.json(newTransfer);
});

router.get("/find/:transferLink", async function (req, res, next) {
  const transferLink = req.params.transferLink;
  const transfer = await Transfer.findOne({ where: { link: transferLink } });

  if (!transfer) {
    res.status(500).json({ error: "not found" });
    return;
  }

  if (req.user && transfer.userId !== req.user.id) {
    res.status(500).json({ error: "wrong user" });
    return;
  }

  if (!req.user) {
    const newCode = generate(6);
    const user = await User.findByPk(transfer.userId);
    await user.update({ verifyCode: newCode });
    await sendEmail(user.email, newCode);
    console.log("USER VERIFY CODE: ", newCode);
    res.json({ transfer, user: req.user || null });
    return;
  }

  res.json({ transfer, user: req.user || null });
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
    if (!transfer || transfer.redeemed || transfer.userId !== req.user.id) {
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
    await transfer.update({ redeemed: true });

    res.json("OK");
  }
);

module.exports = router;
