'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiRefreshCw, FiShare2, FiMic, FiMessageSquare, FiMenu, 
  FiX, FiMaximize, FiMinimize, FiDownload, FiSettings, 
  FiSearch, FiInfo
} from 'react-icons/fi';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import VoiceInput from './VoiceInput';
import ChatSidebar from './ChatSidebar';
import ChatExportModal from './ChatExportModal';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { useChatContext } from '@/context/ChatContext';
import { saveConversationForSharing } from '@/lib/api';
import Image from 'next/image';

export default function ChatInterface() {
  const {
    messages,
    isProcessing,
    isVoiceMode,
    conversationId,
    clearConversation,
    toggleVoiceMode,
    generateShareableLink,
  } = useChatContext();
  
  // UI States
  const [shareUrl, setShareUrl] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  const chatContainerRef = useRef(null);

  // Check if we're on mobile & listen for resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);

  // Full screen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Handle sharing conversation
  const handleShare = async () => {
    try {
      await saveConversationForSharing(conversationId, messages);
      const shareableLink = generateShareableLink();
      setShareUrl(shareableLink);
      
      // Show toast notification
      setShowShareToast(true);
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareableLink)
        .catch(err => console.error('Failed to copy link:', err));
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowShareToast(false);
      }, 3000);
    } catch (error) {
      console.error('Error sharing conversation:', error);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // Filter messages based on search
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Chat container classes
  const containerClasses = `
    ${isFullScreen ? 'fixed inset-0 z-50' : 'relative'} 
    h-[calc(100vh-5rem)] flex flex-col rounded-xl overflow-hidden
    bg-primary-800 shadow-elevation
  `;

  return (
    <>
      {/* Chat Sidebar */}
      <ChatSidebar 
        isOpen={showSidebar} 
        toggleSidebar={toggleSidebar} 
        isMobile={isMobile} 
      />
      
      <div className={containerClasses}>
        {/* Header with brand */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-primary-600 bg-primary-900">
          <div className="flex items-center">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="mr-3 text-primary-200 hover:text-primary-50 p-2 rounded-md hover:bg-primary-700/50"
              aria-label={showSidebar ? "Close sidebar" : "Open sidebar"}
            >
              {showSidebar ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
            
            <div className="flex items-center">
              <motion.div
                initial={{ rotate: -5 }}
                animate={{ rotate: 5 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-accent flex items-center justify-center text-white font-medium mr-2 md:mr-3 flex-shrink-0 overflow-hidden"
              >
                <Image 
                  src="/images/avatar.svg" 
                  alt="AI Peter" 
                  width={36} 
                  height={36} 
                  className="w-full h-full"
                />
              </motion.div>
              <div className="overflow-hidden">
                <div className="text-primary-50 font-medium text-sm md:text-base truncate">AI Peter</div>
                <div className="text-xs text-primary-300 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span> Online
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearchBox(!showSearchBox)}
              className={`p-2 rounded-md ${
                showSearchBox ? 'bg-accent text-white' : 'text-primary-200 hover:bg-primary-700/50 hover:text-primary-50'
              } transition-colors hidden sm:block`}
              aria-label="Search messages"
            >
              <FiSearch size={18} />
            </button>
            
            {/* Theme Switch */}
            <div className="hidden sm:block">
              <ThemeSwitch />
            </div>
            
            {/* Voice/Text Toggle */}
            <button
              onClick={toggleVoiceMode}
              className={`p-2 rounded-md ${
                isVoiceMode ? 'bg-accent text-white' : 'text-primary-200 hover:bg-primary-700/50 hover:text-primary-50'
              } transition-colors`}
              title={isVoiceMode ? "Switch to Text Mode" : "Switch to Voice Mode"}
            >
              {isVoiceMode ? <FiMessageSquare size={18} /> : <FiMic size={18} />}
            </button>
            
            {/* More Options Dropdown */}
            <div className="relative group">
              <button
                className="p-2 rounded-md text-primary-200 hover:bg-primary-700/50 hover:text-primary-50 transition-colors"
                aria-label="More options"
              >
                <FiSettings size={18} />
              </button>
              
              <div className="absolute right-0 top-full mt-1 bg-primary-800 border border-primary-700 rounded-md shadow-lg z-10 w-48 overflow-hidden opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all">
                <div className="py-1">
                  <button
                    onClick={handleShare}
                    className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:bg-primary-700 hover:text-primary-50"
                  >
                    <FiShare2 size={16} className="mr-2" />
                    Share Conversation
                  </button>
                  
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:bg-primary-700 hover:text-primary-50"
                  >
                    <FiDownload size={16} className="mr-2" />
                    Export/Import Chat
                  </button>
                  
                  <button
                    onClick={clearConversation}
                    className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:bg-primary-700 hover:text-primary-50"
                  >
                    <FiRefreshCw size={16} className="mr-2" />
                    New Conversation
                  </button>
                  
                  <button
                    onClick={toggleFullScreen}
                    className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:bg-primary-700 hover:text-primary-50 hidden md:flex"
                  >
                    {isFullScreen ? (
                      <>
                        <FiMinimize size={16} className="mr-2" />
                        Exit Full Screen
                      </>
                    ) : (
                      <>
                        <FiMaximize size={16} className="mr-2" />
                        Full Screen
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="flex items-center w-full px-4 py-2 text-sm text-primary-200 hover:bg-primary-700 hover:text-primary-50"
                  >
                    <FiInfo size={16} className="mr-2" />
                    About AI Peter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search box */}
        <AnimatePresence>
          {showSearchBox && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-primary-600 bg-primary-800 overflow-hidden"
            >
              <div className="p-3 flex items-center">
                <FiSearch size={18} className="text-primary-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  className="flex-grow bg-transparent border-none outline-none text-primary-50 placeholder-primary-400 text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-primary-400 hover:text-primary-200"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Info Panel */}
          <AnimatePresence>
            {showInfoPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '300px', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-l border-primary-600 bg-primary-800 overflow-y-auto h-full"
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-primary-50">About AI Peter</h3>
                    <button 
                      onClick={() => setShowInfoPanel(false)}
                      className="text-primary-400 hover:text-primary-200 p-1"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  
                  <div className="mb-4 text-center">
                    <div className="mx-auto w-16 h-16 bg-accent rounded-full mb-2 overflow-hidden">
                      <Image 
                        src="/images/avatar.svg" 
                        alt="AI Peter"
                        width={64}
                        height={64}
                        className="w-full h-full"
                      />
                    </div>
                    <h4 className="text-primary-50 font-medium">AI Peter</h4>
                    <p className="text-primary-300 text-sm">Super Modern AI Chatbot</p>
                  </div>
                  
                  <div className="space-y-4 text-sm text-primary-300">
                    <p>
                      AI Peter is a state-of-the-art AI assistant designed to provide helpful, accurate responses in a modern, intuitive interface.
                    </p>
                    <div>
                      <h5 className="text-primary-200 font-medium mb-1">Features:</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Text & Voice interactions</li>
                        <li>Code syntax highlighting</li>
                        <li>Conversation sharing</li>
                        <li>Dark/Light mode</li>
                        <li>Export/Import chats</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-primary-200 font-medium mb-1">Tips:</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Use voice mode for hands-free interaction</li>
                        <li>Share conversations with unique links</li>
                        <li>Export chats for safekeeping</li>
                        <li>Write code with triple backticks for syntax highlighting</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Chat history */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-primary-700"
          >
            {filteredMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                {searchQuery ? (
                  <div className="text-center px-4 py-8 rounded-lg bg-primary-800/50">
                    <FiSearch size={36} className="mx-auto mb-4 text-primary-400" />
                    <p className="text-primary-200 mb-2">No messages match your search</p>
                    <p className="text-primary-400 text-sm">Try different keywords</p>
                  </div>
                ) : (
                  <div className="text-center max-w-md px-4 py-8 rounded-lg bg-primary-800/50">
                    <Image
                      src="/images/avatar.svg"
                      alt="AI Peter"
                      width={64}
                      height={64}
                      className="mx-auto mb-6 opacity-90"
                    />
                    <h3 className="text-xl text-primary-50 mb-3">Welcome to AI Peter</h3>
                    <p className="mb-6 text-primary-200">
                      Start by sending a message and I'll respond in real-time with insightful answers.
                    </p>
                    
                    <div className="flex flex-col gap-3 text-sm text-primary-300">
                      <div className="p-3 rounded-md bg-primary-800/70 hover:bg-primary-800 cursor-pointer text-left">
                        "What can you help me with today?"
                      </div>
                      <div className="p-3 rounded-md bg-primary-800/70 hover:bg-primary-800 cursor-pointer text-left">
                        "Tell me a story about artificial intelligence."
                      </div>
                      <div className="p-3 rounded-md bg-primary-800/70 hover:bg-primary-800 cursor-pointer text-left">
                        "What's the difference between machine learning and AI?"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ChatHistory 
                messages={filteredMessages} 
                isProcessing={isProcessing} 
                isMobile={isMobile} 
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="border-t border-primary-600 p-3 md:p-4 bg-primary-800">
          {isVoiceMode ? (
            <VoiceInput />
          ) : (
            <ChatInput />
          )}
        </div>
        
        {/* Share Toast Notification */}
        <AnimatePresence>
          {showShareToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-accent text-white rounded-md shadow-lg text-sm"
            >
              Conversation link copied to clipboard!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Export/Import Modal */}
      <ChatExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
      />
    </>
  );
}
