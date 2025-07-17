const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');


router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

 
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kingsmenpastries@gmail.com',
      pass: 'ojrz xvom abhb txte'
    }
  });

  const mailOptions = {
    from: email,
    to: 'kingsmenpastries@gmail.com',
    subject: `Contact form submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Your message has been sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

module.exports = router;
