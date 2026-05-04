const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;

    if (!token) {
      throw new Error('Authentication token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new Error('Invalid token: user not found');
    }

    socket.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
};

module.exports = socketAuth;
