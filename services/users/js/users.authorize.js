const jwt = require("jsonwebtoken");
const User = require("./users.model");
const user = require("..");
require('dotenv').config();
// const jwtSecret = "4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd";
const jwtSecret = process.env.JWT_SECRET;

// generic auth function not as middleware
// takes only the token and allowed roles as arguments
// returns {success:true/false, user: null/decodedtoken, message: "error message"}



async function authorizeToken (token, allowedRoles = ["admin", "basic"]) {
  if (token) {
    try {
      const decodedToken = jwt.verify(token, jwtSecret);
      // if user role is an array:
      
      if(Array.isArray(decodedToken.role)){
        userHasOneOfAuthorizedRoles = allowedRoles.some(role => decodedToken.role.includes(role));
      } else {
        userHasOneOfAuthorizedRoles = allowedRoles.includes(decodedToken.role);
      }

      if (userHasOneOfAuthorizedRoles) {
        return {success: true, user: decodedToken};
      } else {
        return {success: false, user: null, message: "Not authorized, must be one of " + allowedRoles};
      }
    } catch (err) {
      return {success: false, user: null, message: "Not authorized, decoding error"};
    }
  } else {
    return {success: false, user: null, message: "Not authorized, token not available"};
  }
}


// generic auth function as middleware
// expects req to contain:
// req.cookies.jwt - token
// req.authorizedRoles - array of roles that are allowed to access the route
// adds to req.body:
// req.body.authorized - true/false
// req.body.user - decoded token or null
function auth(condition, onDenial) {
  return async (req, res, next) => {
    console.log("in auth middleware");
    const token = req.cookies.jwt;
    console.log("token", token);

    if (!req.body) {
      req.body = {};
    }

    console.log("token", token);  
    if(!token) {
      req.body.authorized = false;
      req.body.user = null;
      req.body.unAuthorizedMessage = "Not authorized, token not available";
      console.log("token not available");
      return onDenial(req, res);
    }
    let decodedToken = null;

    try {
      decodedToken = jwt.verify(token, jwtSecret);
      console.log("decodedToken", decodedToken);
    } catch (err) {
      req.body.authorized = false;
      req.body.user = null;
      req.body.unAuthorizedMessage = "Not authorized, decoding error";
      console.log("decoding error", err);
      return onDenial(req, res);
    }
      
    if (condition(decodedToken)) {
      req.body.authorized = true;
      console.log("condition success");
      const userData = await User.findById(decodedToken.id);
      if (userData) {
        req.body.user = { id: userData._id, name: userData.username, role: userData.role };
        console.log("user data found", userData);
      } else {
        req.body.user = decodedToken;
        console.log("user data not found", decodedToken);
      }
      return next();
    } else {
      req.body.authorized = false;
      req.body.user = null;
      console.log("condition failed");
      return onDenial(req, res);
    }
  };
}

// admin auth function

function hasRole (user, role) {
  if (Array.isArray(user.role)) {
    return user.role.includes(role);
  } else {
    return user.role === role;
  }
}

function sendUnauthorizedStatus(req, res) {
  req.body.authorized = false;
  req.body.user = null;
  res.status(401).send({
    success: false,
    message: "Unauthorized"
  });
}

const authorizeAdmin = auth(
  condition = user => {return user.role.includes("admin")},
  onDenial = sendUnauthorizedStatus) 

// basic auth function

const authorizeBasic = auth(
  condition = user => {return(user.role.includes("basic"))},
  onDenial = sendUnauthorizedStatus)
// token auth function  




// export as single object
module.exports = { authorizeToken, authorizeAdmin, authorizeBasic, auth };