const express = require('express');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const Vertex = require('./vertex.model');
const router = require('express').Router();
// use json
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Create a new vertex
router.post('/', async (req, res) => {
  console.log('post vex', req.body);
  try {
    const sanitizedContent = sanitizeHtml(req.body.content);

    // find all parents
    const parents = await Vertex.find({ _id: { $in: req.body.parents } });
    if (parents.length !== req.body.parents.length) {
      return res.status(400).json({ error: 'Some parent IDs are invalid' });
    }
    console.log('creating vertex', req.user);
    const vertex = new Vertex({
      content: sanitizedContent,
      parents: req.body.parents || [],
      children: req.body.children || [],
      subscribers: req.body.subscribers || [],
      createdBy: req.user.id
    });

    console.log('vertex', vertex);
    await vertex.save();
    console.log('vertex saved', vertex);

    // add this vertex to the parents' children array
    for (const parent of parents) {
      parent.children.push(vertex._id);
      console.log('saving parent', parent);
      await parent.save();
      console.log('parent saved', parent);
      // Emit socket event for each parent to notify listeners that a new child was added
      const io = req.app.get('io');
      if (io) {
        console.log(
          `Emitting newChild event to parent to room: vex-${parent._id}`
        );
        // Get all sockets in the room
        const room = io.sockets.adapter.rooms.get(`vex-${parent._id}`);
        if (room) {
          // For each socket in the room, verify it's authenticated before sending
          for (const socketId of room) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.user) {
              // Only send to authenticated sockets
              socket.emit('newChild', {
                parentId: parent._id,
                child: vertex
              });
            }
          }
        }
      }
    }
    res.status(201).json(vertex);
  } catch (error) {
    console.log('error creating vertex', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all vertices
router.get('/', async (req, res) => {
  try {
    const vertices = await Vertex.find();
    res.status(200).json(vertices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single vertex by ID
router.get('/:id', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json(vertex);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all children of a vertex by ID
router.get('/:id/children', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // Fetch all children in a single query
    const children = await Vertex.find({ _id: { $in: vertex.children } });
    // sort children by createdAt
    children.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json(children);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all parents of a vertex by ID
router.get('/:id/parents', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // Fetch all parents in a single query
    const parents = await Vertex.find({ _id: { $in: vertex.parents } });
    res.status(200).json(parents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get ancestry (the ids and content of all parents, grandparents, etc.)
router.get('/:id/ancestry', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    const ancestry = [];
    let currentVertex = vertex;

    while (currentVertex) {
      ancestry.unshift({
        id: currentVertex._id,
        content: currentVertex.content
      });
      currentVertex = await Vertex.findById(currentVertex.parents[0]); // Get the first parent
    }
    // dont include the root vertex
    ancestry.pop();

    res.status(200).json(ancestry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a vertex by ID
router.put('/:id', async (req, res) => {
  try {
    const sanitizedContent = sanitizeHtml(req.body.content);
    const vertex = await Vertex.findByIdAndUpdate(
      req.params.id,
      {
        content: sanitizedContent,
        parents: req.body.parents || [],
        subscribers: req.body.subscribers || [],
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json(vertex);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// route to add a reaction to a vertex
router.post('/:id/react', async (req, res) => {
  console.log('post vex reaction', req.body);

  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      console.log('vertex not found');
      return res.status(404).json({ error: 'Vertex not found' });
    }

    const { type, on } = req.body;
    console.log('type', type);
    console.log('on', on);
    if (!['flagged', 'upvote', 'downvote', 'offtopic'].includes(type)) {
      console.log('invalid reaction type', type);
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    console.log('vertex.userReactions', vertex.userReactions);

    const reactionArray = vertex.userReactions[type] || [];

    console.log('reactionArray', reactionArray);
    const userId = req.user.id;
    console.log('userId', userId);
    if (on) {
      // Add user ID if not already present
      if (!reactionArray.includes(userId)) {
        console.log('adding user id to reaction array');
        reactionArray.push(userId);
      }
    } else {
      console.log('removing user id from reaction array');
      // Remove user ID if present
      const index = reactionArray.indexOf(userId);
      if (index > -1) {
        reactionArray.splice(index, 1);
      }
    }
    console.log('reactionArray', reactionArray);

    vertex.userReactions[type] = reactionArray;

    console.log('vertex.userReactions', vertex.userReactions);

    await vertex.save();
    console.log('vertex saved', vertex);
    console.log('sending 200 for', type, on);
    res.status(200).json(vertex);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a vertex by ID
router.delete('/:id', async (req, res) => {
  try {
    const vertex = await Vertex.findByIdAndDelete(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json({ message: 'Vertex deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// mount client to /static
router.use('/static', express.static(path.join(__dirname, 'client')));

// return router
module.exports = {
  router: router,
  Vertex: Vertex
};
