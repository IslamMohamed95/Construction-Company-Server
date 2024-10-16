const jwt = require("jsonwebtoken");
const masterModel = require("../models/master.model");

const auth = () => {
  return async (req, res, next) => {
    try {
      const token = req.header("Authorization").replace("Bearer ", "");
      const key = jwt.verify(token, "key");
      const master = await masterModel.findOne({
        _id: key._id,
        "tokens.token": token,
      });

      req.master = master;
      req.token = token;
      next();
    } catch (e) {
      res.status(500).send({
        apiStatus: false,
        message: e.message,
      });
    }
  };
};

module.exports = auth;
