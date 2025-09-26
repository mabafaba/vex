const express = require('express');
const path = require('path');
const router = express.Router();

// Serve static files from client directory
router.use('/client', express.static(path.join(__dirname, 'client')));

// Route to serve test.html
router.get('/client/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'test.html'));
});

module.exports = {
  router
};

