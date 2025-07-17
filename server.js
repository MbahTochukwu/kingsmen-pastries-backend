const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();


app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));


const PORT = process.env.PORT || 3000;
const mongoose = require('mongoose');
const orderRoutes = require('./routes/orderRoutes.js');
const authRoutes = require('./routes/authRoutes.js');
const contactRoutes = require('./routes/contactRoutes.js');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kingsmen-pastries';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));





app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);


app.get('/', (req, res) => {
  res.send('Kingsmen Pastries Backend is running!');
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
