const express = require("express");

const {
  getWorkspaces,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
} = require("../controllers/workspaceController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(protect, getWorkspaces)
  .post(protect, addWorkspace);

router.route("/:id")
  .put(protect, updateWorkspace)
  .delete(protect, deleteWorkspace);

module.exports = router;