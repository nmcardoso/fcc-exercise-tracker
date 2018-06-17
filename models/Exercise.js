const mongoose = require('mongoose');
const shortid = require('shortid');

const exerciseSchema = new mongoose.Schema({
  _id: {
    type: String, 
    default: shortid.generate 
  },
  user: { 
    type: String, 
    ref: 'User' 
  },
  description: String,
  duration: Number,
  date: Date
});

module.exports = mongoose.model('Exercise', exerciseSchema);