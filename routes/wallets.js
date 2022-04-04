var express = require("express");
var router = express.Router();
const User = require("../models").User;
const Transfer = require("../models").Transfer;
const CoinTransaction = require("../models").CoinTransaction;
const CoinHolding = require("../models").CoinHolding;
const { authenticateJWT } = require("../middleware/auth");
const axios = require("axios");

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

router.get("/", authenticateJWT, async function (req, res, next) {
  const holdings = await CoinHolding.findAll({
    where: { userId: req.user.id },
  });
  for (x in holdings) {
    const price = await getCoinPrice(holdings[x].ticker);
    holdings[x].dataValues.price = (holdings[x].amount * 100 * price).toFixed(
      2
    );
  }
  console.log(holdings);
  res.json(holdings);
});

module.exports = router;
