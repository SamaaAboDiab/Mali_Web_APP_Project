const dns = require("dns");
const mongoose = require("mongoose");

// Some ISP DNS servers refuse SRV lookups (querySrv EREFUSED) needed by mongodb+srv://
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not defined");
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}


module.exports = connectDB;
