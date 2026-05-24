const express = require("express");

const router = express.Router();

let documents = [];

router.get("/", async (req, res) => {
  res.json(documents);
});

router.post("/", async (req, res) => {
  const document = {
    id: Date.now(),
    ...req.body
  };

  documents.push(document);

  res.status(201).json(document);
});

router.put("/:id", async (req, res) => {
  documents = documents.map((item) =>
    item.id == req.params.id
      ? { ...item, ...req.body }
      : item
  );

  res.json({
    success: true
  });
});

router.delete("/:id", async (req, res) => {
  documents = documents.filter(
    (item) => item.id != req.params.id
  );

  res.json({
    success: true
  });
});

module.exports = router;