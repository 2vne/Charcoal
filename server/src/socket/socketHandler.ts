import { Server as SocketIOServer } from 'socket.io';
import { setSocketServer } from '../services/coordinationAgent.js';

export function initializeSocket(io: SocketIOServer) {
  setSocketServer(io);

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
