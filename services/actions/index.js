const Action = require('./server/action.model');
const Group = require('./server/group.model');
const actionRouter = require('./server/action.router');
const groupRouter = require('./server/group.router');

module.exports = {
  Action,
  Group,
  actionRouter,
  groupRouter
};

