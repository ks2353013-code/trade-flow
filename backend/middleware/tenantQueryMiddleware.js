/* TradeFlow Tenant Query Middleware
   Clean fixed version — removes RTF corruption and preserves tenant protection
*/

function getOwnerEmail(req) {
  return (
    req.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    "ks2353013@gmail.com"
  );
}

function secureFind(Model) {
  return async function (req, res, next) {
    try {
      const ownerEmail = getOwnerEmail(req);

      req.ownerEmail = ownerEmail;

      req.secureQuery = {
        ownerEmail
      };

      req.secureFind = async function () {
        return await Model.find({
          ownerEmail
        }).sort({
          createdAt: -1
        });
      };

      next();
    } catch (error) {
      console.error("Tenant secureFind error:", error);

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
      const ownerEmail = getOwnerEmail(req);

      req.ownerEmail = ownerEmail;

      req.secureFindOne = async function (id) {
        return await Model.findOne({
          _id: id,
          ownerEmail
        });
      };

      next();
    } catch (error) {
      console.error("Tenant secureFindOne error:", error);

      res.status(500).json({
        success: false,
        message: "Tenant ownership validation failed"
      });
    }
  };
}

function secureCreate(data, req) {
  const ownerEmail = getOwnerEmail(req);

  return {
    ...data,
    ownerEmail
  };
}

function secureUpdateQuery(id, req) {
  const ownerEmail = getOwnerEmail(req);

  return {
    _id: id,
    ownerEmail
  };
}

module.exports = {
  secureFind,
  secureFindOne,
  secureCreate,
  secureUpdateQuery,
  getOwnerEmail
};