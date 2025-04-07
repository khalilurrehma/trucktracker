import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool, { traccar1Db } from "./config/dbConfig.js";
import bodyParser from "body-parser";
import http from "http";
import categoryRoutes from "./routes/category.js";
import reportRoutes from "./routes/reports.js";
import deviceRoutes from "./routes/devices.js";
import testRoute from "./routes/test.js";
import userRoute from "./routes/user.js";
import dispatchRoute from "./routes/dispatch/services.js";
import dispatchNewCaseRoute from "./routes/dispatch/newCases.js";
import protocolsRoute from "./routes/protocols.js";
import usageControlRoute from "./routes/usageControl.js";
import driverRoute from "./routes/driver.js";
import shiftRoute from "./routes/shift.js";
import realmRoute from "./routes/realms.js";
import subaccountRoute from "./routes/subaccounts.js";
import groupRoute from "./routes/groups.js";
import geofenceRoute from "./routes/geofences.js";
import calculatorRoute from "./routes/calculator.js";
import permissionRoute from "./routes/permission.js";
import sessionRoute from "./routes/session.js";
import notificationsRoute from "./routes/notifications.js";
import traccarRoute from "./routes/traccar.js";
import "./services/cronJobs.js";
import { createWebSocketServer } from "./websocket/wsServer.js";
import { setBroadcast } from "./mqtt/mqtt.handler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);

// const allowedOrigins = [
//   "http://localhost:3000",
//   "http://161.97.136.219:8082",
//   "https://echong.nextop.com.pe",
// ];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(
//           new Error("Echong server is not accessible from unknown locations.")
//         );
//       }
//     },
//     credentials: true,
//   })
// );

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", categoryRoutes);
app.use("/api", reportRoutes);
app.use("/api", deviceRoutes);
app.use("/api", testRoute);
app.use("/api", userRoute);
app.use("/api", dispatchRoute);
app.use("/api", dispatchNewCaseRoute);
app.use("/api", protocolsRoute);
app.use("/api", usageControlRoute);
app.use("/api", driverRoute);
app.use("/api", shiftRoute);
app.use("/api", realmRoute);
app.use("/api", subaccountRoute);
app.use("/api", groupRoute);
app.use("/api", geofenceRoute);
app.use("/api", calculatorRoute);
app.use("/api", permissionRoute);
app.use("/api", sessionRoute);
app.use("/api", notificationsRoute);
app.use("/api", traccarRoute);

app.get("/api", (req, res) => {
  res.send("server running!");
});

const { broadcast } = createWebSocketServer(server);
setBroadcast(broadcast);

pool.getConnection((err, connection) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("database connected");
  connection.release();
});

traccar1Db.getConnection((err, conn) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("traccar1 database connected");
  conn.release();
});
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
