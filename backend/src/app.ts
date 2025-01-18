import * as express from 'express';
import { Express } from 'express';
import * as cors from 'cors';

// Create Express server
const app: Express = express();

// Express configuration
app.set('port', process.env.PORT || 3000);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;