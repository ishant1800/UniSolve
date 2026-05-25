const User = require('../models/User');

const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('-password');
    res.json(agents);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAgents };
