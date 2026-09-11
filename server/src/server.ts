import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import apiRoutes from './routes/apiRoutes.js';
import { initializeSocket } from './socket/socketHandler.js';
import { connectDatabase } from './config/database.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite ports (5173, 5174)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

// Initialize production MongoDB connection with fallback handling
connectDatabase().then((connected) => {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`[PS20 Backend] Agentic Disaster Coordinator Server Online`);
    console.log(`[REST API] http://localhost:${PORT}/api`);
    console.log(`[Socket.IO] Real-time engine active on port ${PORT}`);
    console.log(`[Database Mode] ${connected ? 'MongoDB Production DB' : 'In-Memory Fallback Repository'}`);
    console.log(`=======================================================`);
  });
});
