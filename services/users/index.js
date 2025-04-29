/**
 * This file is responsible for handling user-related operations.
 * It imports necessary modules and sets up the user application.
 *
 * @module users
 * @requires express
 * @requires cookie-parser
 * @requires path
 * @requires ./js/users.authorize
 * @requires ./js/users.authenticate
 * @requires ./js/users.model
 * @requires ./users.router
 *
 * @typedef {Object} app - The user application.
 * @property {Function} auth - authentication middlewear.
 * @property {Function} authorizeAdmin - admin authorization middlewear.
 * @property {Function} authorizeBasic - basic authorization middlewear.
 * @property {Object} User - The User model.
 *
 * @exports users
 */
// import users.server as server - here comes code:
// import all other js files here so that they can be imported from a single file
// rquire all other js files here so that they can be imported from a single file

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const createAuthorizer = require('./js/users.authorize').createAuthorizer;
const authenticate = require('./js/users.authorize').authenticate;

const {
  loginUser,
  registerUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUser,
  createNewUser
} = require('./js/users.authenticate');
const User = require('./js/users.model');

// const connectDB = require("./js/users.db"); // not required if a db connection exists
// connectDB();

async function ensureSuperAdmin () {
  const superAdmin = await User.findOne({
    username: 'superadmin',
    role: { $in: ['superadmin'] }
  });
  if (!superAdmin) {
    console.log('Superadmin user does not exist. Creating one...');
    // check if a password was passed as // pass environment varibale to docker compose up:
    /// docker-compose up -e SUPERADMIN_PASSWORD=yourpassword
    let password = process.env.SUPERADMIN_DEFAULT_PASSWORD;
    if (!password) {
      password = await new Promise((resolve) => {
        readline.question('Enter superadmin password: ', resolve);
      });
      const confirmPassword = await new Promise((resolve) => {
        readline.question('Confirm superadmin password: ', resolve);
      });

      if (password !== confirmPassword) {
        console.log('Passwords do not match. Aborting.');
        process.exit(1);
      }
    }
    console.log('Creating superadmin user with password: ', password);
    createNewUser({ username: 'superadmin', password }, false, [
      'superadmin',
      'admin',
      'basic'
    ]);
    console.log('Superadmin user created successfully.');
  } else {
    // console.log("Superadmin user already exists.");
  }
}

ensureSuperAdmin().then(() => readline.close());

const userApp = express();

const userRouter = require('./js/users.router');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// add view folder to existing app view paths
// mount 'client' folder
userApp.use('/static', express.static(path.join(__dirname, 'client')));

userApp.use(express.json());
userApp.use(cookieParser());
userApp.use(userRouter);

const user = {
  app: userApp,
  authenticate,
  createAuthorizer,
  User
  // connectDB
};

// add all imports to export
module.exports = user;
