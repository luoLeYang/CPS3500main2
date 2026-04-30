'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, Users } from 'lucide-react';

interface ChatPanelProps {
  currentUser: any;
}

export default function ChatPanel({ currentUser }: ChatPanelProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [unreadPrivateMap, setUnreadPrivateMap] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const isAdmin = currentUser?.role === 'employee_admin';
  const [isGroupChat, setIsGroupChat] = useState(!isAdmin);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Track whether user has manually scrolled up
  const isUserScrolledUp = useRef(false);
  // Track last message count to detect new messages
  const lastMessageCount = useRef(0);

  useEffect(() => {
    fetchUsers();
    fetchUnreadPrivateSummary();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setIsGroupChat(false);
    }
  }, [isAdmin]);

  // Reset scroll state and messages when switching chats
  useEffect(() => {
    setMessages([]);
    isUserScrolledUp.current = false;
    lastMessageCount.current = 0;
    fetchMessages();
  }, [isGroupChat, selectedUser]);

  // Polling interval (does NOT trigger scroll on its own)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      fetchUnreadPrivateSummary();
    }, 3000);
    return () => clearInterval(interval);
  }, [isGroupChat, selectedUser]);

  // Only scroll to bottom when new messages arrive AND user hasn't scrolled up
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      lastMessageCount.current = messages.length;
      if (!isUserScrolledUp.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // If user is more than 100px from the bottom, mark as scrolled up
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 100;
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users?viewerId=${currentUser.id}`);
      const data = await res.json();
      const filtered = (Array.isArray(data) ? data : []).filter((u: any) => {
        return u.id !== currentUser.id;
      });

      setUsers(filtered);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      let data: any[];
      if (isGroupChat) {
        if (isAdmin) {
          setMessages([]);
          return;
        }
        const res = await fetch(`/api/messages?roomId=group&userId=${currentUser.id}`);
        data = await res.json();
      } else if (selectedUser) {
        const res = await fetch(
          `/api/messages?userId=${currentUser.id}&recipientId=${selectedUser.id}`
        );
        data = await res.json();
      } else {
        return;
      }
      // API already returns oldest -> newest.
      setMessages(Array.isArray(data) ? data : []);
      if (!isGroupChat && selectedUser) {
        fetchUnreadPrivateSummary();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchUnreadPrivateSummary = async () => {
    try {
      const res = await fetch(`/api/messages?userId=${currentUser.id}&unreadSummary=private`);
      const data = await res.json();
      const nextMap: Record<string, number> = {};
      (Array.isArray(data) ? data : []).forEach((row: any) => {
        if (row?.authorId) {
          nextMap[String(row.authorId)] = Number(row.count || 0);
        }
      });
      setUnreadPrivateMap(nextMap);
    } catch (error) {
      console.error('Failed to fetch private unread summary:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageInput,
          authorId: currentUser.id,
          isPrivate: !isGroupChat,
          recipientId: !isGroupChat ? selectedUser.id : undefined,
          roomId: isGroupChat ? 'group' : undefined
        })
      });

      if (response.ok) {
        setMessageInput('');
        // After sending, always scroll to bottom
        isUserScrolledUp.current = false;
        fetchMessages();
      } else {
        const errBody = await response.json().catch(() => ({}));
        console.error('Failed to send message:', response.status, errBody);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 min-h-[520px] lg:h-[600px]">
      {/* Users Sidebar */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-3 sm:p-4 overflow-y-auto max-h-56 lg:max-h-none">
        {!isAdmin && (
          <div className="mb-4">
            <button
              onClick={() => {
                setIsGroupChat(true);
                setSelectedUser(null);
              }}
              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base ${
                isGroupChat
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users size={20} />
              <span className="font-semibold">Group Chat</span>
            </button>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">
            {isAdmin ? 'Student Direct Messages' : 'Direct Messages'}
          </p>
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setIsGroupChat(false);
                }}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-left ${
                  selectedUser?.id === user.id && !isGroupChat
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium truncate flex-1">{user.name}</span>
                {unreadPrivateMap[user.id] > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" title="New private messages" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden min-h-[420px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <MessageCircle size={24} />
            <h2 className="text-lg sm:text-xl font-bold truncate">
              {isGroupChat ? 'Group Chat' : selectedUser?.name || 'Select a user'}
            </h2>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 bg-gray-50"
        >
          {!isGroupChat && !selectedUser ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Select a user to start a private conversation.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.authorId === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-xs ${
                    msg.authorId === currentUser.id ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <img
                    src={msg.avatar}
                    alt={msg.name}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div>
                    <p className={`text-xs text-gray-500 mb-1 ${msg.authorId === currentUser.id ? 'text-right' : ''}`}>{msg.name}</p>
                    <div
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base break-words ${
                        msg.authorId === currentUser.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${msg.authorId === currentUser.id ? 'text-right' : ''}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="border-t-2 border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={isGroupChat ? 'Type a message to everyone...' : selectedUser ? `Message ${selectedUser.name}...` : 'Select a user first'}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm sm:text-base"
              disabled={!isGroupChat && !selectedUser}
            />
            <button
              type="submit"
              disabled={loading || !messageInput.trim() || (!isGroupChat && !selectedUser)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
