console.log('Starting AccessGuard backend...');

let express, mongoose, cors, helmet, rateLimit, http, socketIo;
let logger, errorHandler, authRoutes, userRoutes, residentRoutes, guestCodeRoutes, guestVisitRoutes, deliveryRoutes, accessLogRoutes, notificationRoutes;

try {
  express = require('express');
  mongoose = require('mongoose');
  cors = require('cors');
  helmet = require('helmet');
  rateLimit = require('express-rate-limit');
  http = require('http');
  socketIo = require('socket.io');
  require('dotenv').config();
  
  console.log('Core modules loaded successfully');
} catch (error) {
  console.error('Error loading core modules:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

try {
  logger = require('./utils/logger');
  errorHandler = require('./middleware/errorHandler');
  authRoutes = require('./routes/auth');
  userRoutes = require('./routes/users');
  residentRoutes = require('./routes/residents');
  guestCodeRoutes = require('./routes/guestCodes');
  guestVisitRoutes = require('./routes/guestVisits');
  deliveryRoutes = require('./routes/deliveries');
  accessLogRoutes = require('./routes/accessLogs');
  notificationRoutes = require('./routes/notifications');
  
  console.log('Application modules loaded successfully');
} catch (error) {
  console.error('Error loading application modules:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with environment-based configuration
const getMongoUri = () => {
  const mongoPassword = process.env.MONGO_PASSWORD;
  const isLocal = process.env.IS_LOCAL === 'true';
  
  logger.info(`Environment check: NODE_ENV=${process.env.NODE_ENV}, IS_LOCAL=${process.env.IS_LOCAL}`);
  logger.info(`MONGO_PASSWORD exists: ${!!mongoPassword}`);
  
  if (!mongoPassword) {
    logger.error('MONGO_PASSWORD environment variable is required');
    logger.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    process.exit(1);
  }
  
  const uri = isLocal 
    ? `mongodb://root:${mongoPassword}@localhost:27016/accessguard`
    : `mongodb://root:${mongoPassword}@mongodb:27017/accessguard`;
    
  logger.info(`MongoDB URI (password hidden): ${uri.replace(mongoPassword, '***')}`);
  return uri;
};

mongoose.connect(getMongoUri())
.then(() => {
  logger.info(`Connected to MongoDB (${process.env.NODE_ENV || 'development'} environment)`);
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  socket.on('join-resident-room', (residentId) => {
    socket.join(`resident-${residentId}`);
    logger.info(`Client ${socket.id} joined resident room: ${residentId}`);
  });

  socket.on('join-security-room', () => {
    socket.join('security-room');
    logger.info(`Client ${socket.id} joined security room`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/guest-codes', guestCodeRoutes);
app.use('/api/guest-visits', guestVisitRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/access-logs', accessLogRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AccessGuard API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`AccessGuard server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app; 