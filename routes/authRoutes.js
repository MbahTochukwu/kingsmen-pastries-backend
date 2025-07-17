const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../kingsmen-pastries-backend/models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    name,
    email,
    password: hashedPassword
  });

  try {
    await newUser.save();
    res.status(201).json({ message: 'User created successfully!' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;


  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  res.status(200).json({ message: 'Login successful!' });
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kingsmenpastries@gmail.com',
    pass: 'ojrz xvom abhb txte'
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
