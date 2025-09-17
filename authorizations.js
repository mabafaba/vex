const {
  authenticate,
  createAuthorizer
} = require('./services/users/js/users.authorize');
const Vertex = require('./services/vertex/index').Vertex;

// Helper functions for authorization conditions
const anyone = (req, res, next) => true;

const pass = (req, res, next) => next();

const isAuthenticated = (req) => req && req.authenticated;

const isAdmin = (req) =>
  req && req.user && req.user.role && req.user.role.includes('admin');

const isBasicUser = (req) =>
  req && req.user && req.user.role && req.user.role.includes('basic');

const isAdminOrSelf = (req) => {
  if (!isAuthenticated(req)) {
    return false;
  }
  if (isAdmin(req)) {
    return true;
  }
  return req.user.id === req.params.id;
};

const isCreatorOfVertex = async (req) => {
  if (!isAuthenticated(req)) {
    return false;
  }
  const vertexId = req.params.id;
  const vertex = await Vertex.findById(vertexId);
  return vertex && vertex.createdBy && vertex.createdBy.equals(req.user.id);
};

const isSubscriberOfVertex = async (req) => {
  if (!isAuthenticated(req)) {
    return false;
  }
  const vertexId = req.params.id;
  const vertex = await Vertex.findById(vertexId);
  return (
    vertex && vertex.subscribers && vertex.subscribers.includes(req.user.id)
  );
};

// Response handlers
const send401 = (req, res, next) =>
  res.status(401).json({ success: false, message: 'Unauthorized' });

const send403 = (req, res, next) =>
  res.status(403).json({ success: false, message: 'Forbidden' });

// Route configurations
const routes = [
  {
    method: 'GET',
    path: '/vex/vertex/static/.*',
    condition: anyone,
    notAuthorized: pass,
    notLoggedIn: pass
  },

  // User routes
  {
    method: 'GET',
    path: '/vex/user/static/.*',
    condition: anyone,
    notAuthorized: pass,
    notLoggedIn: pass
  },
  {
    method: 'GET',
    path: '/vex/user/me',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'PATCH',
    path: '/vex/user/me',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/user/all',
    condition: isAdmin,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'POST',
    path: '/vex/user/register',
    condition: anyone,
    notAuthorized: send403,
    notLoggedIn: pass
  },
  {
    method: 'POST',
    path: '/vex/user/login',
    condition: anyone,
    notAuthorized: send403,
    notLoggedIn: pass
  },
  {
    method: 'GET',
    path: '/vex/user/logout',
    condition: anyone,
    notAuthorized: pass,
    notLoggedIn: pass
  },
  {
    method: 'PUT',
    path: '/vex/user/update',
    condition: isAdminOrSelf,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'DELETE',
    path: '/vex/user/delete',
    condition: isAdminOrSelf,
    notAuthorized: send403,
    notLoggedIn: send401
  },

  // Vertex routes
  {
    method: 'GET',
    path: '/vex/vertex',
    condition: anyone,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/vertex/initial',
    condition: anyone,
    notAuthorized: pass,
    notLoggedIn: pass
  },
  {
    method: 'GET',
    path: '/vex/vertex/[A-Za-z0-9]+',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/vertex/[A-Za-z0-9]+/children/.*',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/vertex/[A-Za-z0-9]+/ancestry',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },

  {
    method: 'GET',
    path: '/vex/vertex/list/[A-Za-z0-9]+/subscribed',
    condition: isAdminOrSelf,
    notAuthorized: send403,
    notLoggedIn: send401
  },

  {
    method: 'POST',
    path: '/vex/vertex/[A-Za-z0-9]+/react',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'POST',
    path: '/vex/vertex',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'PUT',
    path: '/vex/vertex/[A-Za-z0-9]+',
    condition: isCreatorOfVertex,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'DELETE',
    path: '/vex/vertex/[A-Za-z0-9]+',
    condition: isCreatorOfVertex,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'POST',
    path: '/vex/vertex/[A-Za-z0-9]+/subscribe',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'POST',
    path: '/vex/vertex/[A-Za-z0-9]+/unsubscribe',
    condition: isSubscriberOfVertex,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'POST',
    path: '/vex/reactions/.*',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/reactions/.*',
    condition: isAuthenticated,
    notAuthorized: send403,
    notLoggedIn: send401
  },
  {
    method: 'GET',
    path: '/vex/remotetouch/.*',
    // let pass anyone
    condition: anyone,
    notAuthorized: pass,
    notLoggedIn: pass
  }

];

const authorize = createAuthorizer(routes);

module.exports = { authorize, authenticate };
