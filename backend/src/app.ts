import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export default app;