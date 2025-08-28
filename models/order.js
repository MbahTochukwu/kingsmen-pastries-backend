const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  items: [
    {
      item: String,
      price: Number,
      qty: Number,
      total: Number
    }
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String, default: "pay-on-delivery" },
  date: { type: Date, default: Date.now },
  fulfilled: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  discount: { type: Number, default: 0 },
  stampsUsed: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true }
});

module.exports = mongoose.model('Order', orderSchema);