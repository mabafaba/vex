const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type:String, unique:true, required:true },
  password: { type: String, required: true },
  token: { type: String },
  role: [{ type: String, default: 'basic' }],
  // here you can store any other data you want.
  // probably best to keep it simple and flat.
  // or include other mongoose models
  data: { type: Object, default: {} }
},
{ strict: false });

module.exports = mongoose.model('user', userSchema);
