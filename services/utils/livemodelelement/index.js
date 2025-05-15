const mongoose = require('mongoose');
const registeredModels = new Map();
let ioInstance = null;

function initGlobalListeners (io) {
  if (ioInstance) {
    return;
  }
  ioInstance = io;
  io.on('connection', socket => {
    console.log('socket connected', socket.id);

    socket.on('live-model-element-subscribe', async ({ modelName, id }) => {
      if (!modelName || !id) {
        console.error('LiveModelElement: connect() requires modelName and id');
        return;
      }
      const Model = registeredModels.get(modelName);
      if (!Model) {
        console.error('LiveModelElement: No model found for', modelName);
        return;
      }
      socket.join(`${modelName}:${id}`);
    
    }
  );
    socket.on('live-model-element-unsubscribe', ({ modelName, id }) => {
      socket.leave(`${modelName}:${id}`);
    });
  });
}

function liveModel (modelName, schema, endpoint, io) {
  if (!io) {
    throw new Error('Socket.io instance is required');
  }
  if (!schema || !modelName) {
    throw new Error('Schema and modelName are required');
  }
  // If already registered, return the model
  if (registeredModels.has(modelName)) {
    return registeredModels.get(modelName);
  }

  schema.post('findOneAndUpdate', async function (doc) {
    const model = modelName;
    const id = doc._id;
    // send event with model and id (dont send the whole doc)
    ioInstance.to(`${modelName}:${doc._id}`).emit('live-model-element-update', { model, id, endpoint });
  });

  // Register the model
  const Model = mongoose.model(modelName, schema);
  registeredModels.set(modelName, Model);

  initGlobalListeners(io);
  return Model;
}

mongoose.liveModel = liveModel;

module.exports = liveModel;
