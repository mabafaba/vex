const Mongoose = require('mongoose');
const isDocker = process.env.DOCKER === 'true';

const connectDB = function (name) {
  // const url = isDocker ? `mongodb://vex-mongodb:27017/vex' : 'mongodb://localhost:27017/vex';
  const url = isDocker ? `mongodb://${name}-mongodb:27017/${name}` : `mongodb://localhost:27017/${name}`;

  // console.log('mongodb url:', url);

  return (Mongoose.connect(url));
};
module.exports = connectDB;
