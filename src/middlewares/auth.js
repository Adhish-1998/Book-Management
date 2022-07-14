const jwt = require("jsonwebtoken");
const bookModel = require("../models/bookModel");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

let decodedToken;
let token;

/*############################################ AUTHENTICATION ##########################################################*/

const authentication = async (req, res, next) => {
  try {
    token = req.headers["x-api-key" || "X-Api-Key"];
    if (!token) {
      return res.status(401).send({ status: false, message: "No Token Found !!!" });
    }

    decodedToken = jwt.verify(token, "Room 1");

    if (!decodedToken) {
      return res
        .status(401)
        .send({ status: false, message: "Token is invalid !!!" });
    }
    req.loggedIn = decodedToken.userId

   
    next();
  } catch (err) {
    return res.status(401).send({ status: false, message: err.message });
  }
};


/*############################################ AUTHORISATION ##########################################################*/

const authorisation = async (req, res, next) => {

  if (req.body.userId) {
      //Request Body
      if(decodedToken.userId == req.body.userId) return next()
      else return res.status(401).send({ status: false, msg: "Unauthorised!!!" });
   }else if (req.params.bookId) {
      //Path Parameter
      let requiredId = await bookModel.findOne({ _id: req.params.bookId }).select({ userId: 1, _id: 0 })
      let userIdFromBook = requiredId.userId.toString()
      if(decodedToken.userId == userIdFromBook) return next()
      else return res.status(401).send({ status: false, msg: "Unauthorised!!!" });
     }
  req.loggedIn = decodedToken.userId
  return next()

};

module.exports.authentication = authentication;
module.exports.authorisation = authorisation;
