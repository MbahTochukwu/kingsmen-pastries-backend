const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Order = require('../models/order');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// Notification for site visit or login
router.post('/notify-visit', async (req, res) => {
  const { email, name } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'kingsmenpastries@gmail.com', // Your email to receive notifications
    subject: 'New Site Visit or Login',
    text: `User ${name || 'Unknown'} (${email || 'No email'}) has visited or logged into Kingsmen Pastries at ${new Date().toLocaleString()}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Notification sent' });
  } catch (err) {
    console.error('Error sending visit notification:', err);
    res.status(500).json({ message: 'Failed to send notification' });
  }
});


// Order creation with notification
router.post('/orders', protect, async (req, res) => {
  const { customerName, email, address, phone, paymentMethod, items, total, userId, appliedStamps, orderNumber, paymentRef } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Order validation failed: userId is required' });
  }
 try {
    const order = new Order({
      customerName,
      email,
      address,
      phone,
      paymentMethod,
      items: items.map(item => ({
        item: item.item,
        price: item.price,
        qty: item.qty,
        total: item.price * item.qty,
      })),
      total,
      userId,
      discount: appliedStamps * 200,
      stampsUsed: appliedStamps,
      finalAmount: total - (appliedStamps * 200),
      orderNumber,
      paymentRef,
    });
    const newOrder = await order.save();

    // Send email notification for new order
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'your-email@example.com', // Your email to receive notifications
   subject: `New Order #${orderNumber}`,
   text: `New order placed by ${customerName} (${email}) at ${new Date().toLocaleString
    ()}.\n\nDetails:\nAddress: ${address}\nPhone: ${phone}\nItems: ${items
      .map(item => `${item.item} x${item.qty} - ₦${item.price * item.qty}`)
      .join('\n')}\nTotal: ₦${total}\nDiscount: ₦${appliedStamps * 200}\nFinal Amount: ₦$
      {total - (appliedStamps * 200)}`,
      };
      await transporter.sendMail(mailOptions);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error placing order or sending notification:', err);
    res.status(400).json({ message: err.message });
  }
});


// Ping endpoint
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'Server is alive' });
});

router.post('/', async (req, res) => {
  const order = new Order({
    customerName: req.body.customerName,
    email: req.body.email,
    address: req.body.address,
    phone: req.body.phone,
    items: req.body.items,
    total: req.body.total,
    paymentMethod: req.body.paymentMethod,
    userId: req.body.userId,
    discount: req.body.discount || 0,
    finalAmount: req.body.finalAmount || req.body.total
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

router.post('/checkout', async (req, res) => {
  const { userId, items, total, usedStamps } = req.body;

  if (!userId || !items || total == null || usedStamps == null) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const foodStamps = user.foodStamps || 0;
    const maxUsableStamps = Math.min(Math.floor(total / 200), foodStamps);
    const stampsToUse = Math.min(usedStamps, maxUsableStamps); // Safety check

    const discount = stampsToUse * 200;
    const finalAmount = Math.max(total - discount, 0);

    // Update user stamps
    user.foodStamps = foodStamps - stampsToUse;
    await user.save();

    // Optionally: save the order
    const newOrder = new Order({
      userId: loggedInUser._id,
      items: Order,
      total: grandTotal,
      discount,
      stampsUsed: stampsToUse,
      finalAmount,
      date: new Date()
    });
    await newOrder.save();

    res.status(200).json({
      message: 'Order placed successfully',
      finalAmount,
      stampsUsed: stampsToUse,
      remainingStamps: user.foodStamps
    });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const stampsValueInNaira = 200;

router.post('/order',  async (req, res) => {
  const { items, totalPrice, stampsToUse } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validStamps = Math.min(user.foodStamps, stampsToUse || 0);
    const stampDiscount = validStamps * stampsValueInNaira;
    const finalPrice = Math.max(totalPrice - stampDiscount, 0);

    const newOrder = new Order({
      user: userId,
      items,
      totalPrice,
      stampsUsed: validStamps,
      finalPrice
    });

    await newOrder.save();

    user.foodStamps -= validStamps;
    await user.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder
    });
  } catch (err) {
    res.status(500).json({ message: 'Order failed', error: err.message });
  }
});


// POST /api/order
router.post('/order', protect,  async (req, res) => {
  try {
    const { fullName, email, address, phone, payment, items, total, appliedStamps, finalAmount } = req.body;
    const order = new Order({
      customerName: fullName,
      email,
      address,
      phone,
      paymentMethod: payment,
      items: items.map(item => ({
        item: item.item,
        price: item.price,
        qty: item.qty,
        total: item.price * item.qty
      })),
      total,
      userId,
      discount: appliedStamps * 200,
      stampsUsed: appliedStamps,
      finalAmount,
      userId: req.user.id // From JWT middleware
    });
    await order.save();
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});


module.exports = router;
