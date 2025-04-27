const express = require("express");
const {
  createMomoPayment,
  handleMomoCallback,
  handleMomoIPN,
} = require("../controller/momo.controller");

const router = express.Router();

router.post("/momo", createMomoPayment);

router.get("/momo/callback", handleMomoCallback);

router.post("/momo/ipn", handleMomoIPN);

module.exports = router;
