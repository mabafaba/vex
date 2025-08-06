const express = require('express');

const User = require('./users.model');
const {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUser
} = require('./users.authenticate');

const user = require('..');

const router = express.Router();

const sendUnauthorizedStatus = (req, res, next) => {
  if (!req.authorized) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  next();
};

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

router.route('/update').put(updateUser);
router.route('/delete').delete(deleteUser);
router.route('/all').get(getAllUsers);

// Get current user
router.route('/me').get(
  sendUnauthorizedStatus,
  (req, res) => {
    res.send(req.user);
  }
);

// Update current user's data
router.route('/me').patch(
  sendUnauthorizedStatus,
  async (req, res) => {
    try {
      const updates = req.body.data || {};
      const user = await User.findById(req.user.id.toString());

      // Initialize data object if it doesn't exist
      if (!user.data) {
        user.data = {};
      }

      // Update each field in the data object
      Object.keys(updates).forEach((key) => {
        user.data[key] = updates[key];
      });

      const savedUser = await user.save();
      res.json(savedUser);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user data',
        error: error.message
      });
    }
  }
);

router.route('/register').get((req, res) => res.render('register'));
router.route('/login').get((req, res) => res.render('login'));
router.route('/logout').get((req, res) => {
  res.cookie('jwt', '', { maxAge: '1' });

  const target = req.query.targeturl;
  // login page allows to redirect to a target url
  // i.e. user originally wanted to go to 'targeturl' but needs to login first,
  // then the login page will redirect themto 'targeturl'
  if (target) {
    res.redirect(target);
  } else {
    res.redirect('/aovi/views/login');
  }
});

module.exports = router;
