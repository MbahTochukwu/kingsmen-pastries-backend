const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  isAdmin: { type: Boolean, default: false },
  dateCreated: { type: Date, default: Date.now },
  phone: {String},
  address: {String},
  profilePic: {type: String},
  referralCode: { type: String, unique: true }, // e.g., kingsley5678
  referredBy: {String}, // stores the code used to refer
  foodStamps: { type: Number, default: 0 }, // starts at 0
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  referralCount: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('User', userSchema);
