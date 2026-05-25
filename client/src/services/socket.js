import { io } from 'socket.io-client';

// Resolve socket URL from VITE_API_URL if configured, otherwise fallback to local
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    return 'http://localhost:5000';
  }
  // Replace '/api' suffix if present, keeping the origin URL
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
};

const socket = io(getSocketUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
});

export const connectSocket = (token) => {
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;

