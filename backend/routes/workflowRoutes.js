const express = require("express");

const router = express.Router();

let workflows = [];

router.get("/", async (req, res) => {
  res.json(workflows);
});

router.post("/", async (req, res) => {
  const workflow = {
    id: Date.now(),
    ...req.body
  };

  workflows.push(workflow);

  res.status(201).json(workflow);
});

router.put("/:id", async (req, res) => {
  workflows = workflows.map((item) =>
    item.id == req.params.id
      ? { ...item, ...req.body }
      : item
  );

  res.json({
    success: true
  });
});

router.delete("/:id", async (req, res) => {
  workflows = workflows.filter(
    (item) => item.id != req.params.id
  );

  res.json({
    success: true
  });
});

module.exports = router;