
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const must = require('../../utils/must');
const User = require('./users.model');
require('dotenv').config();
// JWT secret must be set in .env file in the root folder of the project
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('you need to add a variable JWT_SECRET with a JWT secret to a .env file in the root folder (not part of the git repository as it is a secret)');
}
/**
 * creates a new user with the provided username and password.
 *
 * @param {Object} userinfo - an object containing the username and password of the new user, as well as any other fields expected by the extendedUserModel
 * @param {object} UserModelExtension - A model to extend the internal user object.
 * @returns {void}
 */
const createNewUser = async (userinfo, UserModelExtension, roles) => {
  if (!roles) {
    roles = ['basic', 'admin'];
  }
  // make sure username and password are provided
  must(userinfo.username, 'Username is required');
  must(userinfo.password, 'Password is required');
  if (UserModelExtension) {
    // well as any other fields provided in the userinfo object
    must(UserModelExtension.schema.obj.user, 'UserModelExtension must have a user field');
    //  make sure user field is a mongoose object id
    must(UserModelExtension.schema.obj.user.type, 'UserModelExtension must have a user field of type mongoose.Schema.Types.ObjectId');
    // make sure all fields in userinfo are in the UserModelExtension except for username and password
    must(Object.keys(userinfo).every(key => key === 'username' || key === 'password' || UserModelExtension.schema.obj[key]), 'UserModelExtension must have all fields in userinfo');

    //  must(Object.keys(userinfo).every(key => UserModelExtension.schema.obj[key]), "UserModelExtension must have all fields in userinfo")
  }
  const hash = await bcrypt.hash(userinfo.password, 10);
  const user = await User.create({
    username: userinfo.username,
    password: hash,
    role: roles,
    data: {}
  });

  await user.save();

  if (UserModelExtension) {
    // make sure UserModelExtension is a mongoose model, has a user field as

    const extendedUser = await UserModelExtension.create({
      user: user._id,
      ...userinfo
    });
    await extendedUser.save();

    return extendedUser;
  }

  return user;
};

const registerUser = async (req, res, next) => {
  const { username, password } = req.body;
  // if (password.length < 6) {
  //   return res.status(400).json({ message: "Password less than 6 characters" });
  // }
  createNewUser({ username, password })
    .then((user) => {
      const maxAge = 24 * 60 * 60; // lasts: 24hrs in sec
      const token = jwt.sign(
        { id: user._id, username, role: user.role },
        jwtSecret,
        {
          expiresIn: maxAge //
        }
      );
      res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: maxAge * 1000 //
      });
      res.status(201).json({
        message: 'User successfully created',
        user: user._id,
        role: user.role
      });
    })
    .catch((error) => {
      res.status(400).json({
        message: 'User not successfully created',
        error: error.message
      });
    }
    );
};

const loginUser = async (req, res, next) => {
  const { username, password } = req.body;
  // Check if username and password is provided
  if (!username || !password) {
    return res.status(400).json({
      message: 'Username or Password not present'
    });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      res.status(400).json({
        message: 'Login not successful',
        error: 'User not found'
      });
    } else {
      // comparing given password with hashed password
      bcrypt.compare(password, user.password).then(function (result) {
        if (result) {
          const maxAge = 24 * 60 * 60;
          const token = jwt.sign(
            { id: user._id, username, role: user.role },
            jwtSecret,
            {
              expiresIn: maxAge // 3hrs in sec
            }
          );
          res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: maxAge * 1000 // 3hrs in ms
          });
          res.status(201).json({
            message: 'User successfully Logged in',
            user: user._id,
            role: user.role
          });
        } else {
          res.status(400).json({ message: 'Login not succesful' });
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      message: 'An error occurred',
      error: error.message
    });
  }
};

const updateUser = async (req, res, next) => {
  const { role, id } = req.body;
  // Verifying if role and id is presnt
  if (role && id) {
    // Verifying if the value of role is admin
    if (role === 'admin') {
      // Finds the user with the id
      await User.findById(id)
        .then((user) => {
          // Verifies the user is not an admin
          if (user.role !== 'admin') {
            user.role = role;
            user.save().catch((err) => {
              //Monogodb error checker
              if (err) {
                return res
                  .status('400')
                  .json({ message: 'An error occurred', error: err.message });
                process.exit(1);
              }
              res.status('201').json({ message: 'Update successful', user });
            });
          } else {
            res.status(400).json({ message: 'User is already an Admin' });
          }
        })
        .catch((error) => {
          res
            .status(400)
            .json({ message: 'An error occurred', error: error.message });
        });
    } else {
      res.status(400).json({
        message: 'Role is not admin'
      });
    }
  } else {
    res.status(400).json({ message: 'Role or Id not present' });
  }
};

const deleteUser = async (req, res, next) => {
  const { id } = req.body;
  await User.deleteOne({
    _id: id
  })
    .then((user) =>  res.status(201).json({ message: 'User successfully deleted', user }))
    .catch((error) => {
      console.warn('error', error);
      res
        .status(400)
        .json({ message: 'An error occurred', error: error.message });
    }
    );
};

/*
  function to return current user details
  */
const getUser = async (req, res, next) => {
  // check if user is logged in
  if (!req.body.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  await User.findById(req.body.user.id)
    .then((user) => {
      res.status(200).json(req.body.user);
    })
    .catch((err) => {
      console.log('error', error);

      res.status(401).json({ message: 'Not successful', error: err.message });
    }
    );
};

const getAllUsers = async (req, res, next) => {
  await User.find({})
    .then((users) => {
      const userFunction = users.map((user) => {
        const container = {};
        container.username = user.username;
        container.role = user.role;
        container.id = user._id;

        return container;
      });
      res.status(200).json({ user: userFunction });
    })
    .catch((err) => {
      console.log('error', error);

      res.status(401).json({ message: 'Not successful', error: err.message });
    }
    );
};

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUser,
  createNewUser
};

