require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Subscription = require("../models/Subscription");

async function migrateSubscriptions() {
  try {
    await connectDB();

    const result = await Subscription.updateMany(
      { plan: "Free" },
      {
        $set: {
          plan: "Starter",
          price: 1999,
          approvalStatus: "Not Required",
          entitlements: {
            aiLimit: 20,
            supplierLimit: 200,
            dealLimit: 50,
            workspaceLimit: 1,
            employeeLimit: 3
          }
        }
      }
    );

    console.log("✅ Subscription migration completed");
    console.log("Matched:", result.matchedCount);
    console.log("Modified:", result.modifiedCount);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrateSubscriptions();