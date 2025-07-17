const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const Order = require('../models/order');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const order = new Order({
    customerName: req.body.customerName,
    email: req.body.email,
    address: req.body.address,
    phone: req.body.phone,
    items: req.body.items,
    total: req.body.total,
    paymentMethod: req.body.paymentMethod
    
  });

  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/user/:email', async (req, res) => {
  const userEmail = req.params.email;

  try {
    const orders = await Order.find({ email: userEmail }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});


router.patch('/:id/fulfill', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isFulfilled = true;
    await order.save();

    res.json({ message: 'Order marked as fulfilled', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
