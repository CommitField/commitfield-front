// src/hooks/useChatWebSocket.js

import { useEffect, useState, useCallback } from 'react';
import webSocketService from '../services/WebSocketService';
import ChatService from '../services/ChatService';

// Hook for chat WebSocket integration
const useChatWebSocket = (roomId, userId, nickname) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle new messages from websocket
  const handleWebSocketMessage = useCallback((message) => {
    console.log('Received message:', message);
    
    // Handle different message types
    switch (message.type) {
      case 'CHAT':
        // Only add the message if it's for the current room
        if (message.roomId === parseInt(roomId)) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
        break;
      case 'SYSTEM':
        // System messages don't have a roomId, so we show them in all rooms
        console.log('System message:', message.message);
        break;
      case 'ERROR':
        console.error('WebSocket error message:', message.message);
        setError(message.message);
        break;
      case 'SUBSCRIBE_ACK':
        console.log('Successfully subscribed to room:', message.roomId);
        break;
      case 'UNSUBSCRIBE_ACK':
        console.log('Successfully unsubscribed from room:', message.roomId);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [roomId]);

  // Load initial messages and connect to WebSocket
  useEffect(() => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);

    // Load initial messages from API
    const loadMessages = async () => {
      try {
        const response = await ChatService.getChatMessages(roomId);
        if (response.success && response.data) {
          setMessages(response.data.map(msg => ({
            type: 'CHAT',
            roomId: parseInt(roomId),
            userId: msg.userId,
            from: msg.nickname,
            message: msg.message,
            sendAt: msg.sendAt
          })));
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMessages();
    
    // Register WebSocket connection status change listener
    const unsubscribeConnection = webSocketService.onConnectionChange(setIsConnected);
    
    // Register WebSocket message listener
    const unsubscribeMessage = webSocketService.onMessage(handleWebSocketMessage);
    
    // Connect to WebSocket and subscribe to room
    const setupWebSocket = async () => {
      try {
        await webSocketService.connect();
        await webSocketService.subscribeToRoom(roomId);
      } catch (err) {
        console.error('Failed to connect to WebSocket:', err);
        setError('Failed to connect to chat server');
      }
    };
    
    setupWebSocket();
    
    // Cleanup function
    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      webSocketService.unsubscribeFromRoom(roomId);
    };
  }, [roomId, handleWebSocketMessage]);

  // Send message function
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText || !roomId || !userId) return false;

    try {
      // Try to send via WebSocket first (real-time)
      const wsResult = await webSocketService.sendMessage(roomId, messageText, userId, nickname);
      
      // Also send via REST API (for persistence) if WebSocket failed
      if (!wsResult) {
        await ChatService.sendMessage(roomId, messageText);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      return false;
    }
  }, [roomId, userId, nickname]);

  return {
    isConnected,
    messages,
    isLoading,
    error,
    sendMessage
  };
};

export default useChatWebSocket;

/* 
// Example usage in your chat component:

import useChatWebSocket from '../hooks/useChatWebSocket';

function ChatRoom({ roomId, userId, nickname }) {
  const { 
    isConnected, 
    messages, 
    isLoading, 
    error, 
    sendMessage 
  } = useChatWebSocket(roomId, userId, nickname);
  
  const [messageText, setMessageText] = useState('');
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    const success = await sendMessage(messageText);
    if (success) {
      setMessageText('');
    }
  };
  
  return (
    <div className="chat-room">
      <div className="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      {isLoading ? (
        <div>Loading messages...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="message-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.userId === userId ? 'mine' : 'other'}`}>
              <div className="sender">{msg.from}</div>
              <div className="content">{msg.message}</div>
              <div className="time">{new Date(msg.sendAt).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type your message..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected || !messageText.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
*/