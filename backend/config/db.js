const mongoose = require("mongoose");

const mongoState = {
  status: "connecting",
  error: "",
  lastAttemptAt: null,
  connectedAt: null
};

function normalizeMongoStatus() {
  if (mongoose.connection.readyState === 1) return "connected";
  if (mongoose.connection.readyState === 2) return "connecting";
  return mongoState.status;
}

function getMongoState() {
  return {
    ...mongoState,
    status: normalizeMongoStatus()
  };
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

const connectDB = async () => {
  const serverSelectionTimeoutMS = Number(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000
  );

  mongoState.status = "connecting";
  mongoState.error = "";
  mongoState.lastAttemptAt = new Date();
  mongoState.connectedAt = null;

  console.log("Mongo connecting...");

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS
    });

    mongoState.status = "connected";
    mongoState.connectedAt = new Date();
    console.log("Mongo connected");
    return true;
  } catch (error) {
    mongoState.status = "failed";
    mongoState.error = error.message;
    console.error("Mongo failed with reason:", error.message);
    return false;
  }
};

module.exports = {
  connectDB,
  getMongoState,
  isMongoConnected
};
