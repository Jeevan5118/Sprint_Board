import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Bell, Users, FileText, Download, Calendar, Search, ArrowUpRight, Clock, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Admin Creation State
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [newUserRole, setNewUserRole] = useState('Member');
    const [newUserTeamId, setNewUserTeamId] = useState('');
    const [teams, setTeams] = useState([]);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [globalReports, setGlobalReports] = useState([]);
    const [reportFilter, setReportFilter] = useState('Today'); // 'Today' or 'Work'
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await api.put('/users/me', { name, email });
            updateUser({ name, email });
            toast.success('Profile updated successfully.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setIsSavingPassword(true);
        try {
            await api.put('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    // Fetch teams when Admin tab is opened
    const handleAdminTabClick = async () => {
        setActiveTab('admin_users');
        if (teams.length === 0) {
            try { const res = await api.get('/teams'); setTeams(res.data); } catch { }
        }
    };

    const fetchGlobalReports = async (type = 'Today') => {
        setIsLoadingReports(true);
        setReportFilter(type);
        try {
            let params = {};
            if (type === 'Today') {
                params.type = 'Report';
                params.startDate = new Date().toISOString().split('T')[0];
            } else if (type === 'Work') {
                params.type = 'Work';
            }
            const res = await api.get('/reports', { params });
            setGlobalReports(res.data);
        } catch (err) {
            toast.error('Failed to fetch global reports');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleGlobalReportsTabClick = () => {
        setActiveTab('global_reports');
        fetchGlobalReports('Today');
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreatingUser(true);
        try {
            const res = await api.post('/admin/users', {
                name: newUserName, email: newUserEmail,
                password: newUserPassword, role: newUserRole
            });
            // If a team was selected, add this new user to that team
            if (newUserTeamId && res.data?.id) {
                await api.post(`/teams/${newUserTeamId}/members`, { user_id: res.data.id });
            }
            toast.success(`Account created for ${newUserName}!`);
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword('');
            setNewUserRole('Member'); setNewUserTeamId('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user account');
        } finally {
            setIsCreatingUser(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your personal profile and security preferences.</p>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        <User className="w-4 h-4 mr-3" /> Profile Details
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'password' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Lock className="w-4 h-4 mr-3" /> Security & Password
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Bell className="w-4 h-4 mr-3" /> Notifications
                    </button>
                    {user?.role === 'Admin' && (
                        <button
                            onClick={handleAdminTabClick}
                            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'admin_users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Users className="w-4 h-4 mr-3" /> User Management
                        </button>
                    )}
                    {user?.role === 'Admin' && (
                        <button
                            onClick={handleGlobalReportsTabClick}
                            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'global_reports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <FileText className="w-4 h-4 mr-3" /> Global Reports
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8">
                    {activeTab === 'profile' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Profile Information</h2>
                            <form onSubmit={handleProfileSubmit} className="space-y-5">
                                <div>
                                    <label className="label-field">Full Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={user?.role === 'Member'} className={`input-field ${user?.role === 'Member' ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-slate-50'}`} />
                                </div>
                                <div>
                                    <label className="label-field">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={user?.role === 'Member'} className={`input-field ${user?.role === 'Member' ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-slate-50'}`} />
                                </div>
                                {user?.role !== 'Member' && (
                                    <div className="pt-4 flex justify-end">
                                        <button type="submit" disabled={isSavingProfile} className="btn-primary">
                                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                                {user?.role === 'Member' && (
                                    <div className="pt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                                        <p className="text-xs text-slate-500 font-medium italic">Identity details are managed by Admin. Please contact support for updates.</p>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Change Password</h2>
                            <form onSubmit={handlePasswordSubmit} className="space-y-5">
                                <div>
                                    <label className="label-field">Current Password</label>
                                    <div className="relative">
                                        <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="input-field pr-10" />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        >
                                            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-field">New Password</label>
                                    <div className="relative">
                                        <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="input-field pr-10" minLength={8} />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters long.</p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={isSavingPassword} className="btn-primary">
                                        {isSavingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Email Notifications</h2>
                            <div className="space-y-4">
                                <label className="flex items-center">
                                    <input type="checkbox" defaultChecked className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" />
                                    <span className="ml-3 text-sm text-slate-700">Receive email when assigned to a task</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" defaultChecked className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" />
                                    <span className="ml-3 text-sm text-slate-700">Receive email when someone comments on your task</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded text-primary-blue focus:ring-primary-blue h-4 w-4" />
                                    <span className="ml-3 text-sm text-slate-700">Receive weekly digest of Sprint progress</span>
                                </label>
                            </div>
                            <div className="pt-8 flex justify-end">
                                <button className="btn-primary">Save Preferences</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'admin_users' && user?.role === 'Admin' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-indigo-900 mb-6 border-b border-slate-100 pb-2 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                                Create New Account
                            </h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-field">Full Name</label>
                                        <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} required className="input-field" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="label-field">Role</label>
                                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} required className="input-field">
                                            <option value="Member">Member</option>
                                            <option value="Team Lead">Team Lead</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-field">Email Address</label>
                                    <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="input-field" placeholder="user@sprintboard.com" />
                                </div>
                                <div>
                                    <label className="label-field">Temporary Password</label>
                                    <div className="relative">
                                        <input type={showAdminPassword ? "text" : "password"} value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required minLength={8} className="input-field pr-10" placeholder="••••••••" />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        >
                                            {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-field">Assign to Team (Optional)</label>
                                    <select value={newUserTeamId} onChange={e => setNewUserTeamId(e.target.value)} className="input-field">
                                        <option value="">No team assignment</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={isCreatingUser} className="inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                                        {isCreatingUser ? 'Creating...' : 'Create Valid Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'global_reports' && user?.role === 'Admin' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-semibold text-emerald-900 flex items-center">
                                    <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                                    Global Submission Audit
                                </h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => fetchGlobalReports('Today')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportFilter === 'Today' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Today's Reports
                                    </button>
                                    <button
                                        onClick={() => fetchGlobalReports('Work')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportFilter === 'Work' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Work Reports
                                    </button>
                                </div>
                            </div>

                            {isLoadingReports ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Object.entries(
                                        globalReports.reduce((acc, report) => {
                                            const name = report.user_name || 'Unassigned';
                                            if (!acc[name]) acc[name] = [];
                                            acc[name].push(report);
                                            return acc;
                                        }, {})
                                    ).map(([userName, reports]) => (
                                        <div key={userName} className="space-y-3">
                                            <div className="flex items-center space-x-2 border-b border-slate-100 pb-1.5">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">{userName}</h3>
                                                <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{reports.length}</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {reports.map(upload => (
                                                    <div key={upload.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:shadow-md transition-all group">
                                                        <div className="flex items-center">
                                                            <div className={`p-2.5 rounded-lg mr-4 ${upload.file_type === 'Report' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{upload.file_name}</p>
                                                                <div className="flex items-center mt-0.5 space-x-3 text-[11px] font-bold text-slate-400 tracking-tight uppercase">
                                                                    <span className="flex items-center text-slate-500">
                                                                        <Users className="w-3 h-3 mr-1" /> {upload.team_name || 'Individual'}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className="flex items-center">
                                                                        <Clock className="w-3 h-3 mr-1" /> {new Date(upload.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <a
                                                                href={`${upload.file_url}${upload.file_url.includes('?') ? '&' : '?'}token=${localStorage.getItem('token')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="View/Download"
                                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-100"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {globalReports.length === 0 && (
                                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                            <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-medium italic">No {reportFilter === 'Today' ? "reports found for today" : "work reports found"} yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
