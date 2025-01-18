import express from 'express';
import cors from 'cors';

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get("/api/status", (req, res) => {
  res.json({ status: "ok" });
});

export default app;