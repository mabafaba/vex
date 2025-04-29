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
  if (req.authorized) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  } else {
    next();
  }
};

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

router.route('/update').put(updateUser);
router.route('/delete').delete(deleteUser);
router.route('/all').get(getAllUsers);
router.route('/me').get(
  // unauthorized users 401
  (req, res) => {
    if (req.authorized) {
      res.send(req.user);
    } else {
      res.status(401).json({ message: 'Not logged in' });
    }
  },
  getUser
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
