"use strict";
require("dotenv").config();

// eslint-disable-next-line import/no-unresolved
const express = require("express");
var cors = require("cors");
var logger = require("morgan");

const app = express();
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(logger("dev"));

var indexRouter = require("./routes/index");
var apiRouter = require("./routes/api");
var authRouter = require("./routes/auth");
var transferRouter = require("./routes/transfers");
var walletRouter = require("./routes/wallets");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.listen(process.env.PORT || 80);

app.use("/", indexRouter);
app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use("/transfer", transferRouter);
app.use("/wallet", walletRouter);

module.exports = app;
