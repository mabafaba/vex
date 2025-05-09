const mongoose = require('mongoose');
const express = require('express');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const Vertex = require('./vertex.model');
const VexList = require('./vexlist.model');
const User = require('../users/js/users.model');
const Reaction = mongoose.model('Reaction'); // Adjust the path as necessary
const router = require('express').Router();

// console log the pre hooks on reaction
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
    console.log('creating vertex', req.body);

    const reactions = new Reaction();
    await reactions.save();
    console.log('reactions saved', reactions);
    const vertex = new Vertex({
      content: sanitizedContent,
      parents: req.body.parents || [],
      children: req.body.children || [],
      subscribers: req.body.subscribers || [],
      reactions: reactions._id,
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
              // Only send the new vex ID
              socket.emit('newChild', {
                parentId: parent._id,
                childId: vertex._id
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

// Route for a user to subscribe to a vex
router.post('/:id/subscribe', async (req, res) => {
  try {
    const userId = req.user.id;
    const vertexId = req.params.id;

    // Find the vexlist named 'subscribed' for the current user
    let vexlist = await VexList.findOne({ name: 'subscribed', user: userId });

    // If the vexlist doesn't exist, create it
    if (!vexlist) {
      vexlist = new VexList({
        name: 'subscribed',
        user: userId,
        vertices: []
      });
    }

    // Add the vertex ID to the vexlist if not already present
    if (!vexlist.vertices.includes(vertexId)) {
      vexlist.vertices.push(vertexId);
      await vexlist.save();
    }

    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//delete all vertices
router.get('/delete', async (req, res) => {
  console.log('deleting all vertices');
  try {
    await Vertex.deleteMany({});
    res.status(200).json({ message: 'All vertices deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vertices
router.get('/', async (req, res) => {
  try {
    const vertices = await Vertex.find().populate('createdBy', 'username');
    res.status(200).json(vertices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single vertex by ID
router.get('/:id', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id).populate('createdBy', 'username');
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json(vertex);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all children of a vertex by ID
router.get('/:id/children/:sorting', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // Fetch all children in a single query with populated createdBy
    const children = await Vertex.find({ _id: { $in: vertex.children } }).populate('createdBy', 'username');

    // Sort based on path parameter
    const sortBy = req.params.sorting;
    if (sortBy === 'upvotes') {
      children.sort((a, b) => {
        const aUpvotes = (a.userReactions?.upvote || []).length;
        const bUpvotes = (b.userReactions?.upvote || []).length;
        return bUpvotes - aUpvotes;
      });
    } else if (sortBy === 'hot') {
      children.sort((a, b) => {
        const aUpvotes = (a.userReactions?.upvote || []).length;
        const bUpvotes = (b.userReactions?.upvote || []).length;
        const aScore = Math.log10(aUpvotes + 1) * 287015 + a.createdAt.getTime() / 1000;
        const bScore = Math.log10(bUpvotes + 1) * 287015 + b.createdAt.getTime() / 1000;
        return bScore - aScore;
      });
    } else {
      // Default sort by date (newest first)
      children.sort((a, b) => b.createdAt - a.createdAt);
    }

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

    // Fetch all parents in a single query with populated createdBy
    const parents = await Vertex.find({ _id: { $in: vertex.parents } }).populate('createdBy', 'username');
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
      // Populate the current vertex with creator info
      const populatedVertex = await Vertex.findById(currentVertex._id).populate('createdBy', 'username');
      ancestry.unshift({
        id: populatedVertex._id,
        content: populatedVertex.content,
        createdBy: populatedVertex.createdBy
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

// Get all vexes in the vexlist named 'subscribed' for the current user
router.get('/list/:user/subscribed', async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the vexlist named 'subscribed' for the current user
    let vexlist = await VexList.findOne({ name: 'subscribed', user: userId });

    // If the vexlist doesn't exist, create it and return an empty array
    if (!vexlist) {
      vexlist = new VexList({
        name: 'subscribed',
        user: userId,
        vertices: []
      });
      await vexlist.save();
      return res.status(200).json([]);
    }

    // Fetch all vexes in the vexlist
    const vexes = await Vertex.find({ _id: { $in: vexlist.vertices } }).populate('createdBy', 'username');
    res.status(200).json(vexes);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    if (!['flagged', 'upvote', 'downvote', 'offtopic', 'join'].includes(type)) {
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

    vertex.userReactions[type] = reactionArray;

    console.log('vertex.userReactions', vertex.userReactions);

    await vertex.save();
    // let everyone who is subscribed to this one's parent vex know that the reaction has changed
    const io = req.app.get('io');
    if (io) {
      console.log(
        `Emitting reactionChange event to parent to room: vex-${vertex.parents[0]}`
      );
      // Get all sockets in the room
      const room = io.sockets.adapter.rooms.get(`vex-${vertex.parents[0]}`);
      console.log('room is', room);
      if (room) {
        console.log('found room', room);
        // For each socket in the room, verify it's authenticated before sending
        for (const socketId of room) {
          console.log('getting socket', socketId);
          const socket = io.sockets.sockets.get(socketId);
          if (socket && socket.user) {
            // Only send the new vex ID
            socket.emit('reactionChange', {
              vertexId: vertex._id,
              type,
              on
            });
          }
        }
      }
    }
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
