import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);


import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDB();