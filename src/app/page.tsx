'use client';

import { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatPanel from '@/components/ChatPanel';
import ProposalPanel from '@/components/ProposalPanel';
import NotificationCenter from '@/components/NotificationCenter';
import LoginMenu from '@/components/LoginMenu';
import AIAssistant from '@/components/AIAssistant';
import AdminPanel from '@/components/AdminPanel';
import ScreenReaderControls from '@/components/ScreenReaderControls';
import ThemeToggle from '@/components/ThemeToggle';
import { Bell, MessageSquare, FileText, LogOut, Users } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const notificationPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchContextData = async () => {
      const isStaffAdmin = currentUser?.role === 'employee_admin';
      const messagesPromise = isStaffAdmin
        ? Promise.resolve([])
        : fetch(`/api/messages?roomId=group&userId=${currentUser.id}`).then(r => r.json()).catch(() => []);

      const [unreadRes, proposalsRes, notifRes, allVotesRes, messagesRes] = await Promise.all([
        fetch(`/api/notifications?userId=${currentUser.id}&unreadOnly=true`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/proposals?status=active`).then(r => r.json()).catch(() => []),
        fetch(`/api/notifications?userId=${currentUser.id}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/votes?all=true`).then(r => r.json()).catch(() => []),
        messagesPromise,
      ]);
      setUnreadCount(unreadRes.unreadCount || 0);
      // Attach votes (with comments) to each proposal
      const votesArr: any[] = Array.isArray(allVotesRes) ? allVotesRes : [];
      const enrichedProposals = (Array.isArray(proposalsRes) ? proposalsRes : []).map((p: any) => ({
        ...p,
        votes: votesArr.filter((v: any) => v.proposalId === p.id),
      }));
      setProposals(enrichedProposals);
      setNotifications(notifRes.notifications || []);
      setRecentMessages(Array.isArray(messagesRes) ? messagesRes.slice(-20) : []);
    };

    fetchContextData();
    notificationPollRef.current = setInterval(fetchContextData, 5000);

    return () => {
      if (notificationPollRef.current) clearInterval(notificationPollRef.current);
    };
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isStaffAdmin = currentUser?.role === 'employee_admin';

  if (!currentUser) {
    return <LoginMenu onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="app-header bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-blue-900 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-purple-600 flex items-center justify-center font-bold shrink-0">
              🏠
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Dorm Communication System</h1>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
            <div className="user-pill flex items-center gap-2 sm:gap-3 bg-white bg-opacity-20 px-3 sm:px-4 py-2 rounded-full shrink-0">
              <span className="user-pill-name text-sm sm:text-base">{currentUser.name}</span>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full"
              />
            </div>
            <ThemeToggle />
            <ScreenReaderControls />
            <NotificationCenter userId={currentUser.id} unreadCount={unreadCount} />
            <button
              onClick={handleLogout}
              className="app-signout-btn bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition shrink-0"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-24 sm:pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`app-tabs-list grid w-full ${isStaffAdmin ? 'grid-cols-4' : 'grid-cols-3'} bg-white shadow-md rounded-xl p-1` }>
            <TabsTrigger value="chat" className="flex items-center justify-center gap-1 sm:gap-2 min-h-10 sm:min-h-11">
              <MessageSquare size={18} />
              Chat
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center justify-center gap-1 sm:gap-2 min-h-10 sm:min-h-11">
              <FileText size={18} />
              Proposals
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center gap-1 sm:gap-2 min-h-10 sm:min-h-11">
              <Bell size={18} />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            {isStaffAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Users size={18} />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <ChatPanel currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="proposals" className="mt-6">
            <ProposalPanel currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationCenter userId={currentUser.id} detailed />
          </TabsContent>

          {isStaffAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminPanel currentUser={currentUser} />
            </TabsContent>
          )}
        </Tabs>
      </main>
      <AIAssistant screenContext={{ currentUser, activeTab, proposals, notifications, recentMessages }} />
    </div>
  );
}
