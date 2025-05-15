const express = require('express');
const Reaction = require('./reaction.model');
const path = require('path');
const router = express.Router();

router.use('/static', express.static(path.join(__dirname, '../client')));

// Get a reaction document by ID
router.get('/:id', async (req, res) => {
  try {
    const reaction = await Reaction.findById(req.params.id);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    res.json(reaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a user reaction (type) to a reaction document
router.post('/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const reaction = await Reaction.findById(id);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    reaction.addReaction(userId, type);
    await reaction.save();
    res.json(reaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
