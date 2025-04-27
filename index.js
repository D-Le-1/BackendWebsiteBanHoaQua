const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const authRouter = require("./routers/authRouter");
const productRouter = require("./routers/productRouter");
const categoryRouter = require("./routers/categoryRouter");
const orderRouter = require("./routers/orderRouter");
const couponRouter = require("./routers/couponRouter");
const paymentRouter = require("./routers/paymentRounter");
const vnpayRoutes = require("./routers/vnpay.router");
const dashboardRouter = require("./routers/dashBoardRouter");
const reviewRoutes = require("./routers/reviewRouter");
const path = require("path");
require("dotenv").config();

const allowedOrigins = ["http://localhost:5173"]; // Ensure the origin is a string and not undefined
// const allowedOrigins = ["https://6c52-116-101-151-64.ngrok-free.app"];
const testOrigin = function (origin) {
  let allowed = false;

  if (!origin) {
    // Allow requests with no origin (e.g., curl or Postman)
    return true;
  }

  for (var i = 0; i < allowedOrigins.length; i++) {
    if (allowedOrigins[i] === origin) {
      allowed = true;
      break;
    }
  }

  return allowed;
};

const corsOptions = {
  credentials: true,
  origin: function (origin, callback) {
    if (testOrigin(origin)) {
      console.log("CORS allowed for origin: " + origin);
      callback(null, true);
    } else {
      console.log("CORS blocked for origin: " + origin);
      callback(new Error("Origin " + origin + " not allowed"));
    }
  },
};
const app = express();
app.options("*", cors());
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/products", productRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/payment", vnpayRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.json({ message: "Hello from server" });
});

app.listen(process.env.PORT, () => {
  console.log("listening....");
});
