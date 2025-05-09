
const router = require('./server/reaction.router');

function reactions (io) {
  const Reaction = require('./server/reaction.model')(io);
  return ({
    router,
    Reaction
  }
  );
}

module.exports = reactions;
