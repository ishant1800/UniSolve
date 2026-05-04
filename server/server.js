const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const { initSocket } = require('./socket');
const connectDB = require('./db');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const { startSlaJob } = require('./jobs/slaJob');

const app = express();
app.use(cors());
app.use(express.json());

// API versioning path prefix
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', aiRoutes);
app.use('/', aiRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

const startServer = async () => {
  try {
    await connectDB();
    startSlaJob();

    server.listen(PORT, () => {
      console.log(`UniSolve backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
