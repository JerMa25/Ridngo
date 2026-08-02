"use client"
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import api from '@/lib/api-client';

interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderRole: string;
  content: string;
  sentAt: string;
}

interface ChatWidgetProps {
  rideId: string;
  userId: string;
  userRole: string; // 'PASSENGER' or 'DRIVER'
}

export const ChatWidget = ({ rideId, userId, userRole }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  const fetchMessages = async (since?: string) => {
    try {
      let url = `/api/v1/chat/${rideId}/messages`;
      if (since) url += `?since=${since}`;

      const res = await api.get(url);
      const data: ChatMessage[] = res.data;

      if (data && data.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev];
          data.forEach(m => {
            if (!newMessages.find(existing => existing.id === m.id)) {
              newMessages.push(m);
            }
          });
          return newMessages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        });
        setLastFetchTime(data[data.length - 1].sentAt);

        if (!isOpen) {
          // Increment unread if message is not from me
          const newOthers = data.filter(m => m.senderId !== userId);
          setUnreadCount(prev => prev + newOthers.length);
        }
      }
    } catch (e) {
      console.error("Chat fetch error", e);
    }
  };

  useEffect(() => {
    // Initial fetch
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    // Polling setup (every 3 seconds)
    const interval = setInterval(() => {
      fetchMessages(lastFetchTime || undefined);
    }, 3000);

    return () => clearInterval(interval);
  }, [rideId, lastFetchTime, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    setNewMessage("");

    // Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: Math.random().toString(),
      rideId,
      senderId: userId,
      senderRole: userRole,
      content,
      sentAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      await api.post(`/api/v1/chat/${rideId}/messages`, {
        content,
        senderRole: userRole
      });
      // La prochaine boucle de polling mettra à jour l'ID réel
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-orange-btn text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-background">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] glass bg-background shadow-2xl rounded-3xl flex flex-col overflow-hidden border border-foreground/10"
          >
            {/* Header */}
            <div className="bg-foreground/5 p-4 flex items-center justify-between border-b border-foreground/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-btn/20 text-orange-btn rounded-xl flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm">Chat en direct</h3>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En ligne
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/10 text-foreground/50 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-foreground/[0.02]">
              {loading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-orange-btn opacity-50" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Aucun message</p>
                  <p className="text-[10px]">Envoyez le premier message</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === userId;
                    return (
                      <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                          isMe 
                            ? 'bg-orange-btn text-white rounded-br-sm' 
                            : 'bg-white text-foreground shadow-sm rounded-bl-sm dark:bg-foreground/10'
                        }`}>
                          <p className="font-medium">{msg.content}</p>
                          <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/70' : 'opacity-40'}`}>
                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-background border-t border-foreground/10">
              <form onSubmit={handleSend} className="flex items-center gap-2 relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez un message..."
                  className="flex-1 bg-foreground/5 rounded-2xl py-3 pl-4 pr-12 text-sm font-medium outline-none focus:bg-foreground/10 transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="absolute right-2 w-8 h-8 flex items-center justify-center bg-orange-btn text-white rounded-xl disabled:opacity-30 disabled:scale-100 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
