const mongoose = require('mongoose');
const registeredModels = new Map();
const io = require('../io')();
const initialized = false;

io.on('connection', socket => {
  // Subscribe: join a room based on endpoint string
  socket.on('live-model-element-subscribe', async ({ endpoint }) => {
    if (!endpoint) {
      console.error('LiveModelElement: connect() requires endpoint');
      return;
    }
    socket.join(`live-model-element-update:${endpoint}`);
  });

  // Unsubscribe: leave the room
  socket.on('live-model-element-unsubscribe', ({ endpoint }) => {
    if (!endpoint) {
      return;
    }
    socket.leave(`live-model-element-update:${endpoint}`);
  });
});

function liveModel (modelName, schema, url) {
  // if (!io) {
  //   throw new Error('Socket.io instance is required');
  // }
  if (!schema || !modelName) {
    throw new Error('Schema and modelName are required');
  }
  // If already registered, return the model
  if (registeredModels.has(modelName)) {
    return registeredModels.get(modelName);
  }

  // Add a liveUpdate instance method to the schema
  schema.methods.updateClients = function () {
    if (!url) {
      return;
    }
    const endpoint = `${url}/${this._id}`;
    const eventName = `live-model-element-update:${endpoint}`;
    io.to(eventName).emit(eventName);
  };

  // Register the model
  const Model = mongoose.model(modelName, schema);
  registeredModels.set(modelName, Model);

  return Model;
}

mongoose.liveModel = liveModel;

module.exports = liveModel;
