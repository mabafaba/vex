const jwt = require('jsonwebtoken');
const User = require('./users.model');
const user = require('..');
require('dotenv').config();
// const jwtSecret = "4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd";
const jwtSecret = process.env.JWT_SECRET;

// generic auth function as middleware
// expects req to contain:
// req.cookies.jwt - token
// req.authorizedRoles - array of roles that are allowed to access the route
// adds to req.body:
// req.body.authorized - true/false
// req.user - decoded token or null
async function authenticate (req, res, next) {
  const token = req.cookies.jwt;

  if (req.authenticated) {
    // remove token from body
    delete req.authenticated;
  }

  if (req.user) {
    // remove user from body
    delete req.user;
  }

  if (!token) {
    req.authenticated = false;
    req.user = null;
    req.unAuthenticatedMessage = 'Not authenticated, token not available';
    return next();
  }
  let decodedToken = null;

  try {
    decodedToken = jwt.verify(token, jwtSecret);
  } catch (err) {
    req.authenticated = false;
    req.user = null;
    req.unAuthenticatedMessage = 'Not authenticated, decoding error';
    console.log('decoding error', err);
    return next();
  }

  const userData = await User.findById(decodedToken.id);

  if (!userData) {
    req.authenticated = false;
    req.user = null;
    req.unAuthenticatedMessage = 'Not authenticated, user data not found';
    return next();
  }

  if (!userData.role || !userData.username || !userData._id) {
    req.authenticated = false;
    req.user = null;
    req.unAuthenticatedMessage = 'Not authenticated, user data is incomplete';
    return next();
  }

  req.user = {
    id: userData._id,
    name: userData.username,
    role: userData.role
  };

  req.authenticated = true;
  req.unAuthenticatedMessage = null;
  return next();
}

function matchPath (pattern, path) {
  const regex = new RegExp(`^${pattern}$`); //
  const isMatch = regex.test(path);
  return isMatch;
}

const createAuthorizer = function (routes) {
  return async (req, res, next) => {
    // find the route that matches the request
    const route = routes.find(
      (route) =>
        (route.method === '*' || route.method === req.method) &&
        matchPath(route.path, req.originalUrl)
    );

    if (!route) {
      console.warn('Unauthorized by default', req.method, req.originalUrl);
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized by default' });
    }

    if (!route.condition || !route.notAuthorized || !route.notLoggedIn) {
      console.warn('middleware for route missing', req.method, req.originalUrl);
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized by default' });
    }

    // if user is not authenticated, use notLoggedIn middleware for this route
    if (!req.authenticated) {
      if (route.notLoggedIn) {
        return route.notLoggedIn(req, res, next);
      } else {
        console.warn(
          'No notLoggedIn middleware for this route',
          req.method,
          req.originalUrl
        );
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized by default' });
      }
    }
    try {
      conditionMet = await route.condition(req, res, next);

      if (!conditionMet) {
        return route.notAuthorized(req, res, next);
      }
    } catch (err) {
      return route.notAuthorized(req, res, next);
    }

    if (conditionMet) {
      req.authorized = true;
      return next();
    }

    // Reject all others
    res
      .status(401)
      .json({ success: false, message: 'Unauthorized by default' });
  };
};

// export as single object
module.exports = { authenticate, createAuthorizer };
