/* ======================
   TEMP ADMIN RESET
====================== */

app.get("/api/reset-admin-now", async (req, res) => {

  try {

    const email = "ks2353013@gmail.com";
    const password = "tradeflow123";

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user =
      await User.findOneAndUpdate(

        { email },

        {
          $set: {

            companyName: "TradeFlow AI",
            name: "Krishna",
            email,
            password: hashedPassword,

            role: "ADMIN",

            plan: "ENTERPRISE",

            subscriptionStatus: "ACTIVE",

            trialEndsAt:
              new Date(
                Date.now() +
                365 * 24 * 60 * 60 * 1000
              ),

          },

          $setOnInsert: {

            companyId:
              new mongoose.Types.ObjectId().toString(),

          },

        },

        {
          upsert: true,
          new: true,
        }

      );

    res.json({

      success: true,
      message: "Admin reset done",

      email,
      password,

      userId: user._id,
      companyId: user.companyId,

    });

  } catch (error) {

    res.status(500).json({

      success: false,
      error: error.message,

    });

  }

});

/* ======================
   ROOT ROUTE
====================== */

app.get("/", (req, res) => {

  res.json({

    status: "TradeFlow AI backend running",
    mode: "Admin OS + Money-ready SaaS backend",
    admin: "enabled"

  });

});

/* ======================
   TEST ROUTE
====================== */

app.get("/test", (req, res) => {

  res.json({

    success: true,
    message: "Server Working"

  });

});

/* ======================
   SERVER START
====================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});