import { io, Socket } from 'socket.io-client';
import { auth } from './firebase';

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection);
            resolve(this.socket);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    try {
      // Get auth token
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';

      // Create socket connection
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.reconnectAttempts++;
        this.isConnecting = false;
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WebSocket] Reconnect attempt ${attemptNumber}`);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('[WebSocket] Reconnection failed');
        this.isConnecting = false;
      });

      return this.socket;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emit event to server
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[WebSocket] Not connected. Cannot emit event:', event);
    }
  }

  /**
   * Listen to event from server
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Join a room/namespace
   */
  joinRoom(room: string): void {
    this.emit('join', { room });
  }

  /**
   * Leave a room/namespace
   */
  leaveRoom(room: string): void {
    this.emit('leave', { room });
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

export default wsManager;
export { WebSocketManager };
