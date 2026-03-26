import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, Menu, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);

    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                if (user) {
                    const { data } = await api.get('/notifications');
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };
        fetchNotifications();
        // Option to add setInterval here for polling every 30-60s in production
    }, [user]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

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

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-30 relative">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="md:hidden text-slate-500 hover:text-slate-700 mr-4 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="relative hidden sm:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue w-64"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Notifications Dropdown Container */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-danger-red text-[8px] font-bold text-white ring-2 ring-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2">
                            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-primary-blue hover:text-blue-800 font-medium">Mark all read</button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex-1">
                                            <p className={`text-sm ${!notif.is_read ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                                        </div>
                                        {!notif.is_read && (
                                            <button onClick={() => markAsRead(notif.id)} className="text-slate-400 hover:text-success-green flex-shrink-0" title="Mark as read">
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-sm text-slate-500">No new notifications.</div>
                                )}
                            </div>
                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                <Link to="/timeline" onClick={() => setShowNotifications(false)} className="text-xs font-medium text-slate-500 hover:text-slate-800">View Activity Timeline</Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-700">{user?.name || 'Admin User'}</p>
                        <p className="text-xs text-slate-500">{user?.role || 'System Admin'}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center font-bold relative group cursor-pointer" onClick={logout}>
                        {user?.name?.charAt(0) || 'A'}
                        <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-sm z-20 pointer-events-none group-hover:pointer-events-auto text-center text-slate-800">
                            Log out
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
