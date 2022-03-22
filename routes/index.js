var express = require("express");
var router = express.Router();

router.get("/", async function (req, res, next) {
  var paypal = require('paypal-node-sdk');


  // console.log(gateway.clientToken);

  // gateway.transaction.find("2NX02539WC416293Y", (err, transaction) => {
  //   console.log("err: ", err);
  //   transaction.paypalAccount.sellerProtectionStatus;
  //   // "ELIGIBLE"
  // });
  res.json("OK");
  // gateway.clientToken.generate({}, (err, response) => {
  //   console.log("response", response)
  //   res.send(response.clientToken);
  // });
});

module.exports = router;
