const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
  type: String,
  required: true,
  unique: true,
  lowercase: true,
  trim: true,
  match: [/^\S+@\S+\.\S+$/, "Email invalide"],
},

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    default: "user",
    enum: ["admin", "user"],
  },

  refreshToken: {
    type: String,
    default: null,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
