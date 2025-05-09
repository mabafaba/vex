const mongoose = require('mongoose');
const TestDocSchema = new mongoose.Schema({
  name: String,
  value: Number
});

const testDoc = mongoose.model('TestDoc', TestDocSchema);
module.exports = testDoc;
