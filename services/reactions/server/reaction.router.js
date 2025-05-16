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
    // {counts: {...}, myReactions: ['upvote',...]}
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const counts = {
      flagged: reaction.flagged.length,
      offtopic: reaction.offtopic.length,
      downvote: reaction.downvote.length,
      upvote: reaction.upvote.length,
      join: reaction.join.length
    };

    console.log('counts', counts);
    console.log('userId', userId);
    console.log('reaction', reaction);
    // myReactions = ['upvote', 'join']
    const myReactions = ['flagged', 'offtopic', 'downvote', 'upvote', 'join']
      .filter(type => reaction[type].includes(userId)
      );

    res.json({
      counts,
      myReactions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * Explicitly turn user reactions on or off for a reaction document.
 * Expects body: { actions: [{ type: 'upvote', action: 'on'|'off' }, ...] }
 */
router.post('/:id', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { id } = req.params;
    const newReactions = req.body; // expects { reactions: ['upvote', ...] }
    if (!Array.isArray(newReactions.reactions)) {
      return res.status(400).json({ error: 'Missing reactions array' });
    }
    const allTypes = ['flagged', 'offtopic', 'downvote', 'upvote', 'join'];
    // Build update: add userId to selected, remove from others
    const addTo = newReactions.reactions;
    const pullFrom = allTypes.filter(type => !addTo.includes(type));
    const update = {
      $addToSet: {},
      $pull: {}
    };
    addTo.forEach(type => {
      update.$addToSet[type] = userId;
    });
    pullFrom.forEach(type => {
      update.$pull[type] = userId;
    });
    // Remove empty updates
    if (Object.keys(update.$addToSet).length === 0) {
      delete update.$addToSet;
    }
    if (Object.keys(update.$pull).length === 0) {
      delete update.$pull;
    }

    const reaction = await Reaction.findByIdAndUpdate(id, update);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    console.log('updating clients');
    reaction.updateClients();
    res.json(reaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
