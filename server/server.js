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
const userRoutes = require('./routes/userRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const { startSlaJob } = require('./jobs/slaJob');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware to audit routing matches and reachability
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Health Check Endpoint (Lightweight keep-alive ping to eliminate Render cold starts)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Debug routing endpoints to verify server mount state
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Root test route working' });
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API test route working' });
});

app.get('/api/ai/test', (req, res) => {
  res.json({ success: true, message: 'API AI test route working' });
});

// API versioning path prefixes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Mount AI routes securely under standard endpoints
app.use('/api/ai', aiRoutes);
app.use('/api', aiRoutes); // Legacy alias for backward compatibility
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
