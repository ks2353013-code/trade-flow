const Supplier = require("../models/Supplier");

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create({
      user: req.user._id,
      supplierName: req.body.supplierName,
      product: req.body.product,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
      score: req.body.score || 75,
      status: req.body.status || "Verified Lead",
      source: req.body.source || "Manual Entry",
      notes: req.body.notes || "",
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (supplier.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized to delete this supplier",
      });
    }

    await supplier.deleteOne();

    res.json({
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getSuppliers,
  addSupplier,
  deleteSupplier,
};