const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Primary details (To be filled in initial signup)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },//password may be null for OAuth users
    role: {
      type: String,
      enum: ["poster", "freelancer", "both"],
      required: false,
    },

    // About (To be filled from Profile page)
    phone: { type: Number, required: false, sparse: true },
    roll: { type: Number, required: false },
    branch: { type: String, required: false },
    bio: { type: String, required: false },
    skills: { type: [String], required: false },
    image: { type: String, required: false },
    imagePublicId: { type: String, required: false},
    year: { type: String, required: false },
    dob: { type: Date, required: false },

    // Socials & Portfolio (To be filled from Profile page)
    linkedin: { type: String, required: false },
    github: { type: String, required: false },
    instagram: { type: String, required: false },
    portfolio: { type: String, required: false },

    //status fields
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    verificationExpires: { type: Date, required: false },
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpires: { type: Date, required: false },

    //Rating System
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
