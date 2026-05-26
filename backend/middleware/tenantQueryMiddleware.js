function secureFind(Model) {
  return async function (req, res, next) {
    try {
      const ownerEmail = req.ownerEmail;

      req.secureQuery = {
        ownerEmail
      };

      req.secureFind = async () => {
        return await Model.find({
          ownerEmail
        }).sort({ createdAt: -1 });
      };

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Tenant query protection failed"
      });
    }
  };
}

function secureFindOne(Model) {
  return async function (req, res, next) {
    try {
      const ownerEmail = req.ownerEmail;

      req.secureFindOne = async (id) => {
        return await Model.findOne({
          _id: id,
          ownerEmail
        });
      };

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Tenant ownership validation failed"
      });
    }
  };
}

module.exports = {
  secureFind,
  secureFindOne
};{\rtf1}