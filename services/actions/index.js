const Action = require('./server/action.model');
const Group = require('./server/group.model');
const Place = require('./server/place.model');
const actionRouter = require('./server/action.router');
const groupRouter = require('./server/group.router');
const placeRouter = require('./server/place.router');

module.exports = {
  Action,
  Group,
  Place,
  actionRouter,
  groupRouter,
  placeRouter
};

