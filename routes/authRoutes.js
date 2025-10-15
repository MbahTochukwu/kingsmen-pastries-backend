const express = require('express');
const { OAuth2Client } = require("google-auth-library");
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

router.post('/signup', async (req, res) => {
  const { name, email, password, referredBy } = req.body;

  try {
    let existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Save hashed password
      referralCode: generateReferralCode(name, email),
      referredBy,
      foodStamps: 0,
      referralCount: 0,
    });

    await newUser.save();

    // If referredBy is valid, reward the referrer
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        referrer.foodStamps += 10;
        referrer.referralCount += 1;
        await referrer.save();
      }
    }

    res.status(201).json({ message: "Signup successful", user: newUser });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

 function generateReferralCode(name) {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${name.toLowerCase().replace(/\s+/g, '')}${random}`;
 }

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET ,
      { expiresIn: process.env.JWT_EXPIRES_IN  }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google-login', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'No token provided' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    console.log("Google payload:", payload);

    // Check if user exists
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      // Create new user
      user = new User({
        name: payload.name,
        email: payload.email,
        profilePic: payload.picture,
        password: "" // Optional: Generate random string if needed
      });
      await user.save();
    } else {
      // Update profilePic if changed
      if (user.profilePic !== payload.picture) {
        user.profilePic = payload.picture;
        await user.save();
      }
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic
      },
      token: jwtToken
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ success: false, message: 'Token verification failed', details: error.message });
  }
});


// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const token = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetURL = `https://kingsmen-pastries-backend.onrender.com/reset-password/${token}`;

    const mailOptions = {
      to: user.email,
      from: 'kingsmenpastries@gmail.com',
      subject: 'Kingsmen Pastries Password Reset',
      text: `You requested a password reset.\n\nClick the link to reset your password:\n\n${resetURL}`
    };
     await
    transporter.sendMail(mailOptions, (err, response) => {
      if (err) console.error('Error sending email', err);
      else res.json({ message: "Password reset email sent." });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password has been reset." });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;