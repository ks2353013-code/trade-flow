const express = require("express");

const router = express.Router();

let crmData = [];

router.get("/", async (req, res) => {
  res.json(crmData);
});

router.post("/", async (req, res) => {
  const item = {
    id: Date.now(),
    ...req.body
  };

  crmData.push(item);

  res.status(201).json(item);
});

router.put("/:id", async (req, res) => {
  crmData = crmData.map((item) =>
    item.id == req.params.id
      ? { ...item, ...req.body }
      : item
  );

  res.json({
    success: true
  });
});

router.delete("/:id", async (req, res) => {
  crmData = crmData.filter(
    (item) => item.id != req.params.id
  );

  res.json({
    success: true
  });
});

module.exports = router;