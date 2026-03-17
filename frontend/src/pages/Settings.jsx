import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Bell, Users, FileText, Download, Calendar, Search, ArrowUpRight, Clock, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
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

    // Global Reports & Audit State
    const [globalReports, setGlobalReports] = useState([]);
    const [reportFilter, setReportFilter] = useState('Today'); // 'Today', 'Work'
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditData, setAuditData] = useState([]);
    const [expandedMembers, setExpandedMembers] = useState({});

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

    const fetchGlobalReports = async (type = 'Today', date = selectedDate) => {
        setIsLoadingReports(true);
        setReportFilter(type);
        try {
            let params = {};
            if (type === 'Today') {
                params.type = 'Report';
                params.startDate = date;
                params.endDate = date + 'T23:59:59';
            } else if (type === 'Work') {
                params.type = 'Work';
                params.startDate = date;
                params.endDate = date + 'T23:59:59';
            }
            const res = await api.get('/reports', { params });
            setGlobalReports(res.data);

            // Also fetch audit data if filtering for reports
            if (type === 'Today') fetchReportAudit(date);
        } catch (err) {
            toast.error('Failed to fetch global reports');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const fetchReportAudit = async (date) => {
        try {
            const res = await api.get('/reports/audit', { params: { date } });
            setAuditData(res.data);
        } catch (err) {
            console.error("Audit fetch failed", err);
        }
    };

    const handleGlobalReportsTabClick = () => {
        setActiveTab('global_reports');
        fetchGlobalReports('Today', selectedDate);
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        fetchGlobalReports(reportFilter, newDate);
    };

    const toggleMemberExpand = (memberName) => {
        setExpandedMembers(prev => ({
            ...prev,
            [memberName]: !prev[memberName]
        }));
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
                <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
                    <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'profile' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <User className="w-4 h-4 mr-3" /> Profile Details
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'password' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Lock className="w-4 h-4 mr-3" /> Security & Password
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'notifications' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Bell className="w-4 h-4 mr-3" /> Notifications
                        </button>
                        {user?.role === 'Admin' && (
                            <button
                                onClick={handleAdminTabClick}
                                className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'admin_users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <Users className="w-4 h-4 mr-3" /> User Management
                            </button>
                        )}
                        {user?.role === 'Admin' && (
                            <button
                                onClick={handleGlobalReportsTabClick}
                                className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'global_reports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <FileText className="w-4 h-4 mr-3" /> Global Reports
                            </button>
                        )}
                    </div>
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
                        <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
                            {/* Header & Date Configuration */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                                <div>
                                    <h2 className="text-lg font-bold text-emerald-900 flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                                        Submission Audit
                                    </h2>
                                    <p className="text-xs text-emerald-600 font-medium mt-0.5">Track daily reports and identify missing updates</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                                        </div>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                            className="block w-full pl-10 pr-3 py-2 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="flex bg-white/50 p-1 rounded-xl border border-emerald-100 shadow-sm">
                                        <button
                                            onClick={() => fetchGlobalReports('Today', selectedDate)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${reportFilter === 'Today' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                        >
                                            Reports
                                        </button>
                                        <button
                                            onClick={() => fetchGlobalReports('Work', selectedDate)}
                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${reportFilter === 'Work' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}
                                        >
                                            Work
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {isLoadingReports ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 animate-pulse">
                                    <div className="relative">
                                        <div className="w-12 h-12 border-4 border-emerald-100 rounded-full"></div>
                                        <div className="absolute top-0 w-12 h-12 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Analyzing submissions...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Submission Audit Summary (Only for Daily Reports) */}
                                    {reportFilter === 'Today' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submissions Received</p>
                                                        <p className="text-3xl font-black text-emerald-600 mt-1">{auditData.filter(m => m.has_submitted).length}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                                        <CheckCircle2 className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {auditData.filter(m => m.has_submitted).slice(0, 5).map(m => (
                                                        <span key={m.id} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100/50">{m.name}</span>
                                                    ))}
                                                    {auditData.filter(m => m.has_submitted).length > 5 && (
                                                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1">+ {auditData.filter(m => m.has_submitted).length - 5} more</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-rose-200 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missing Updates</p>
                                                        <p className="text-3xl font-black text-rose-500 mt-1">{auditData.filter(m => !m.has_submitted).length}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                                        <AlertCircle className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {auditData.filter(m => !m.has_submitted).slice(0, 5).map(m => (
                                                        <span key={m.id} className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded-md border border-rose-100/50">{m.name}</span>
                                                    ))}
                                                    {auditData.filter(m => !m.has_submitted).length > 5 && (
                                                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1">+ {auditData.filter(m => !m.has_submitted).length - 5} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Member Reports Accordion */}
                                    <div className="space-y-3">
                                        <div className="flex items-center px-4 mb-2">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex-1">Member Reports</h3>
                                            <span className="text-[10px] font-bold text-slate-400">{Object.keys(globalReports.reduce((acc, r) => { (acc[r.user_name] = acc[r.user_name] || []).push(r); return acc; }, {})).length} Members active</span>
                                        </div>

                                        {Object.entries(
                                            globalReports.reduce((acc, report) => {
                                                const name = report.user_name || 'Unassigned';
                                                if (!acc[name]) acc[name] = [];
                                                acc[name].push(report);
                                                return acc;
                                            }, {})
                                        ).map(([userName, reports]) => (
                                            <div key={userName} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${expandedMembers[userName] ? 'border-primary-blue/30 shadow-lg shadow-primary-blue/5' : 'border-slate-200 shadow-sm'}`}>
                                                <button
                                                    onClick={() => toggleMemberExpand(userName)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                            {userName.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">{userName}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5">{reports[0].team_name || 'Individual contribution'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex -space-x-2">
                                                            {reports.slice(0, 3).map((r, i) => (
                                                                <div key={r.id} className={`w-7 h-7 rounded-lg border-2 border-white flex items-center justify-center text-white ${r.file_type === 'Report' ? 'bg-emerald-500' : 'bg-blue-500'}`} title={r.file_name}>
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className={`p-1.5 rounded-lg transition-transform duration-300 ${expandedMembers[userName] ? 'rotate-180 bg-primary-blue/10 text-primary-blue' : 'bg-slate-50 text-slate-400'}`}>
                                                            <ChevronDown className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </button>

                                                {expandedMembers[userName] && (
                                                    <div className="px-4 pb-4 pt-2 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                                        {reports.map(upload => (
                                                            <div key={upload.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-white hover:border-slate-200 transition-all group">
                                                                <div className="flex items-center min-w-0">
                                                                    <div className={`p-2.5 rounded-xl mr-4 flex-shrink-0 ${upload.file_type === 'Report' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                        <FileText className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <p className="text-sm font-black text-slate-900 truncate">{upload.file_name}</p>
                                                                        <div className="flex items-center mt-0.5 space-x-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            <span className="flex items-center">
                                                                                <Clock className="w-3 h-3 mr-1" /> {new Date(upload.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                            <span className="flex items-center bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                                                                                {upload.file_type}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={`${upload.file_url}${upload.file_url.includes('?') ? '&' : '?'}token=${localStorage.getItem('token')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex-shrink-0 p-2.5 bg-white text-slate-400 hover:text-emerald-600 hover:shadow-md rounded-xl transition-all border border-slate-200 hover:border-emerald-200 group-hover:-translate-y-0.5"
                                                                    title="View Details"
                                                                >
                                                                    <Download className="w-5 h-5" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {globalReports.length === 0 && (
                                            <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No entries found for this date</p>
                                                <p className="text-[10px] text-slate-400 mt-1">Try selecting a different date or checking the audit summary.</p>
                                            </div>
                                        )}
                                    </div>
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
