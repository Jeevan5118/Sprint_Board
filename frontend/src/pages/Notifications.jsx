import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Check, Clock, ShieldAlert, CheckCircle, Package, Users, LayoutDashboard, Loader2, FolderKanban } from 'lucide-react';

const Notifications = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        const fetchAllNotifications = async () => {
            try {
                if (user) {
                    // Fetch up to 500 notifications for the dedicated page history
                    const { data } = await api.get('/notifications?limit=500');
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Error fetching full notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllNotifications();
    }, [user]);

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch {
            console.error("Failed to mark all as read");
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch {
            console.error("Failed to mark notification as read");
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }
        if (notif.link_url) {
            navigate(notif.link_url);
        }
    };

    // Derived State: Categorization
    const { categorized, tabs } = useMemo(() => {
        const groups = {
            'All': notifications,
            'Sprints': [],
            'Tasks': [],
            'Projects': [],
            'Reports': [],
            'System': []
        };

        notifications.forEach(n => {
            const type = n.type || 'System';
            if (type.includes('Sprint')) groups['Sprints'].push(n);
            else if (type.includes('Task')) groups['Tasks'].push(n);
            else if (type.includes('Project')) groups['Projects'].push(n);
            else if (type.includes('Report')) groups['Reports'].push(n);
            else groups['System'].push(n);
        });

        // Only show tabs that have items, keep 'All' regardless
        const activeTabs = ['All', ...['Sprints', 'Tasks', 'Projects', 'Reports', 'System'].filter(k => groups[k].length > 0)];

        return { categorized: groups, tabs: activeTabs };
    }, [notifications]);

    const getIconForType = (type) => {
        if (type.includes('Sprint')) return <Clock className="w-5 h-5 text-purple-500" />;
        if (type === 'TaskAssigned') return <Package className="w-5 h-5 text-blue-500" />;
        if (type === 'TaskCreated') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
        if (type === 'TaskStatus') return <ShieldAlert className="w-5 h-5 text-amber-500" />;
        if (type === 'TaskUpdated') return <LayoutDashboard className="w-5 h-5 text-orange-500" />;
        if (type.includes('Project')) return <FolderKanban className="w-5 h-5 text-indigo-500" />;
        if (type.includes('Report')) return <ShieldAlert className="w-5 h-5 text-indigo-500" />;
        if (type.includes('System')) return <Users className="w-5 h-5 text-slate-500" />;
        return <Bell className="w-5 h-5 text-slate-500" />;
    };

    const displayedNotifications = categorized[activeTab] || [];
    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Notifications Inbox
                        {unreadCount > 0 && (
                            <span className="bg-danger-red text-white text-sm font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                {unreadCount} New
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Review all your system, sprint, and task alerts across the workspace.</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                        <Check className="w-4 h-4" /> Wait, mark all as read
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                {/* Sidebar Categories */}
                <div className="md:w-64 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Categories</h3>
                    <nav className="space-y-1">
                        {tabs.map(tab => {
                            const count = tab === 'All' ? notifications.length : categorized[tab].length;
                            const unreadTabCount = categorized[tab].filter(n => !n.is_read).length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab 
                                        ? 'bg-primary-blue text-white shadow-md' 
                                        : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        {tab}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {unreadTabCount > 0 && activeTab !== tab && (
                                            <span className="w-2 h-2 rounded-full bg-danger-red" />
                                        )}
                                        <span className={`px-2 py-0.5 rounded-md text-xs ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Notifications List */}
                <div className="flex-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-800">{activeTab} Alerts</h2>
                            <span className="text-sm font-medium text-slate-500">{displayedNotifications.length} items</span>
                        </div>

                        {displayedNotifications.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-800 font-medium text-lg">You're all caught up!</h3>
                                <p className="text-slate-500 mt-2 text-sm max-w-sm">No notifications found in this category.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {displayedNotifications.map(notif => (
                                    <div 
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-5 flex gap-4 transition-all hover:bg-slate-50 ${!notif.is_read ? 'bg-blue-50/30' : ''} ${notif.link_url ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className="shrink-0 mt-1">
                                            {getIconForType(notif.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex sm:items-center flex-col sm:flex-row gap-1 sm:gap-4 mb-1">
                                                <h4 className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {notif.type.replace(/([A-Z])/g, ' $1').trim()}
                                                </h4>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    {new Date(notif.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                            <p className={`text-sm mt-1 whitespace-pre-wrap ${!notif.is_read ? 'text-slate-800' : 'text-slate-500'}`}>
                                                {notif.message}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <div className="shrink-0 flex items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notif.id);
                                                    }}
                                                    title="Mark as read"
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-success-green hover:bg-green-50 transition-colors"
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
