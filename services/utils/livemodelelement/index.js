const registeredModels = new Map();
let ioInstance = null;

function initGlobalListeners (io) {
  if (ioInstance) {
    return;
  }
  ioInstance = io;
  io.on('connection', socket => {
    console.log('socket connected', socket.id);
    socket.on('live-model-element-subscribe', async ({ modelName, id }, cb) => {
      console.log('live-model-element-subscribe', modelName, id);
      if (modelName && id) {
        socket.join(`${modelName}:${id}`);
        const Model = registeredModels.get(modelName);
        if (Model) {
          const doc = await Model.findById(id).lean();
          if (cb) {
            cb(doc);
          }
        }
      }
    });
    socket.on('live-model-element-unsubscribe', ({ modelName, id }) => {
      console.log('live-model-element-unsubscribe', modelName, id);
      if (modelName && id) {
        socket.leave(`${modelName}:${id}`);
      }
    });
    socket.on('live-model-element-get', async ({ modelName, id }) => {
      console.log('live-model-element-get', modelName, id);
      const Model = registeredModels.get(modelName);
      if (Model && id) {
        let doc = await Model.findById(id).lean();

        //pick onSend function from registeredModels
        const onSend = registeredModels.get(`${modelName}:onSend`);
        if (onSend) {
          doc = onSend(doc);
        }
        socket.emit('live-model-element-update', doc);
      }
    });

    socket.on('live-model-element-patch', async ({ modelName, _id, liveObject }) => {
      const Model = registeredModels.get(modelName);
      if (Model && _id) {
        let document = await Model.findById(_id);
        console.log('live-model-element-patch', modelName, _id, liveObject);
        console.log('document', document);

        const onReceive = registeredModels.get(`${modelName}:onReceive`);
        console.log('onReceive', onReceive);
        console.log('old document', document);
        if (onReceive) {
          console.log('Before onReceive:', document instanceof Model);
          document = onReceive(document, liveObject);
          console.log('After onReceive:', document instanceof Model);
        }
        // Apply the changes to the document
        console.log('saving document', document);

        await document.save();
      }
    });
  });
}

function liveModel (modelName, schema, io, onSend, onReceive) {
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

  // Attach post-save and post-updateOne hooks before model registration
  schema.post('save', function (doc) {
    if (ioInstance) {
      let obj = doc.toObject();
      if (onSend) {
        obj = onSend(obj);
      }
      ioInstance.to(`${modelName}:${doc._id}`).emit('live-model-element-update', obj);
    }
  });
  schema.post('updateOne', function () {
    if (ioInstance) {
      const query = this.getQuery();
      if (query._id) {
        const Model = mongoose.model(modelName);
        Model.findById(query._id).lean().then(doc => {
          if (doc) {
            let obj = doc;
            if (onSend) {
              obj = onSend(obj);
            }
            ioInstance.to(`${modelName}:${query._id}`).emit('live-model-element-update', obj);
          }
        });
      }
    }
  });

  // Register the model
  const Model = mongoose.model(modelName, schema);
  registeredModels.set(modelName, Model);
  if (onSend) {
    registeredModels.set(`${modelName}:onSend`, onSend);
  }
  if (onReceive) {
    registeredModels.set(`${modelName}:onReceive`, onReceive);
  }
  initGlobalListeners(io);
  return Model;
}

// Optionally, attach to mongoose
const mongoose = require('mongoose');
mongoose.liveModel = liveModel;

module.exports = liveModel;
