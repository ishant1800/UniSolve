import { io } from 'socket.io-client';

const token = localStorage.getItem('unisolve_token');

const socket = io('http://localhost:5000', {
  auth: {
    token,
  },
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
});

export default socket;
