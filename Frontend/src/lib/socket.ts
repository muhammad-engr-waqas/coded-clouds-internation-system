/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Socket.io connection helper for the CCIMS backend.
 * Drop into your frontend at: src/lib/socket.ts
 * Requires: npm install socket.io-client  (already in your package.json)
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/** Call once after login (once you have the JWT token) to open the real-time connection. */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { auth: { token } });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/*
Usage example inside a React component/hook:

  useEffect(() => {
    const token = localStorage.getItem('ccims_token');
    if (!token) return;
    const s = connectSocket(token);

    s.on('task:assigned', (task) => { ... refresh My Tasks board ... });
    s.on('task:report:new', ({ taskId, report }) => { ... append to thread if viewing this task ... });
    s.on('attendance:update', (payload) => { ... live-update Admin/HR attendance table ... });
    s.on('leave:new', (leave) => { ... prepend to HR/Admin leave queue ... });
    s.on('leave:statusChanged', (leave) => { ... update employee's own leave table ... });
    s.on('message:new', (message) => { ... append to open chat window ... });
    s.on('notification:new', (notif) => { ... show toast + bump bell badge ... });

    return () => {
      s.off('task:assigned');
      s.off('task:report:new');
      // ...etc
    };
  }, []);

For chat screens specifically, join/leave the channel room while it's open:
  socket.emit('chat:join', channelId);
  // ...
  socket.emit('chat:leave', channelId);
*/
