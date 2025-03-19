'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchAIResponse } from '@/lib/api';

const ChatContext = createContext();

export function useChatContext() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([{
    id: uuidv4(),
    role: 'assistant',
    content: "Hello there! I'm AI Peter. How can I assist you today?",
    timestamp: new Date().toISOString()
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [conversationId, setConversationId] = useState(uuidv4());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Ref to track if localStorage is available and working
  const localStorageAvailable = useRef(false);
  
  // Check if localStorage is available and working
  useEffect(() => {
    try {
      localStorage.setItem('chat_test', 'test');
      localStorage.removeItem('chat_test');
      localStorageAvailable.current = true;
      console.log('localStorage is available');
    } catch (e) {
      console.warn('localStorage is not available:', e);
      localStorageAvailable.current = false;
    }
    
    // Initialize a new conversation ID if needed
    const newConversationId = uuidv4();
    setConversationId(newConversationId);
    console.log('Chat context initialized with conversation ID:', newConversationId);
    
    // Mark as initialized immediately with default welcome message
    setIsInitialized(true);
  }, []);
  
  // Load messages from localStorage after initialization
  useEffect(() => {
    if (!localStorageAvailable.current || !conversationId) return;
    
    try {
      // Load messages from localStorage if available
      const loadedMessages = localStorage.getItem(`chat_${conversationId}`);
      if (loadedMessages) {
        const parsedMessages = JSON.parse(loadedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          console.log('Loaded messages from localStorage:', parsedMessages.length);
          setMessages(parsedMessages);
        }
      }
    } catch (e) {
      console.error('Error loading messages from localStorage:', e);
      // Continue with default welcome message
    }
  }, [conversationId]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!localStorageAvailable.current || !conversationId || messages.length === 0) return;
    
    try {
      localStorage.setItem(`chat_${conversationId}`, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving messages to localStorage:', e);
    }
  }, [messages, conversationId]);

  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return;
    
    // Add user message to the chat
    const userMessageObj = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    
    // Show typing indicator
    setIsProcessing(true);
    
    try {
      // Call AI API
      const aiResponse = await fetchAIResponse(userMessage);
      
      // Add AI response to the chat
      const aiMessageObj = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessageObj]);
      
      return aiMessageObj; // Return the message for voice handling
    } catch (error) {
      console.error('Error fetching AI response:', error);
      
      // Add error message
      const errorMessageObj = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
      return errorMessageObj;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    const newConversationId = uuidv4();
    setConversationId(newConversationId);
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: "Hello there! I'm AI Peter. How can I assist you today?",
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Clean up localStorage for the old conversation
    if (localStorageAvailable.current && conversationId) {
      try {
        localStorage.removeItem(`chat_${conversationId}`);
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
    }
  }, [conversationId]);

  const generateShareableLink = useCallback(() => {
    return `${window.location.origin}/share/${conversationId}`;
  }, [conversationId]);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(prev => !prev);
  }, []);

  const value = {
    messages,
    isProcessing,
    isVoiceMode,
    conversationId,
    sendMessage,
    clearConversation,
    generateShareableLink,
    toggleVoiceMode,
    isInitialized
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
