import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, CheckCircle2, AlertCircle, PlayCircle, Users, X, FileText, Upload } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

// Team-wise analytics modal – Now uses pre-calculated data from the parent Dashboard
const TeamAnalyticsModal = ({ isOpen, onClose, filter, teamData }) => {
    if (!isOpen) return null;

    const filterLabel = {
        total: 'Total Tasks',
        completed: 'Completed Tasks',
        leadTime: 'Avg Lead Time (Days)',
        throughput: 'Weekly Velocity (Tasks/Week)'
    }[filter];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-900">Team-wise Analytics — {filterLabel}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="space-y-4">
                    {teamData.map(t => (
                        <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">{t.name}</h4>
                                <div className="flex items-center space-x-3 text-sm">
                                    <span className="text-slate-500 font-medium">{t.total} tasks</span>
                                    <Link to={`/teams/${t.id}/sprint-board`} className="text-primary-blue hover:text-blue-800 font-bold text-xs flex items-center">
                                        View Board <ArrowUpRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden border border-slate-200/50">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: t.total > 0 ? `${Math.round((t.done / t.total) * 100)}%` : '0%' }}></div>
                            </div>

                            <div className="grid grid-cols-4 gap-3 text-center">
                                <AnalyticsInfoCard label="Total" value={t.total} active={filter === 'total'} color="slate" />
                                <AnalyticsInfoCard label="Done" value={t.done} active={filter === 'completed'} color="green" />
                                <AnalyticsInfoCard label="Lead Time" value={`${t.leadTime}d`} active={filter === 'leadTime'} color="indigo" />
                                <AnalyticsInfoCard label="Velocity" value={t.throughput} active={filter === 'throughput'} color="blue" />
                            </div>
                        </div>
                    ))}
                    {teamData.length === 0 && (
                        <div className="py-20 text-center">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No team data available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnalyticsInfoCard = ({ label, value, active, color }) => {
    const colorClasses = {
        slate: active ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-200' : 'bg-slate-50 border-slate-100',
        green: active ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100' : 'bg-emerald-50/30 border-emerald-100/50',
        indigo: active ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-indigo-50/30 border-indigo-100/50',
        blue: active ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-blue-50/30 border-blue-100/50',
    };

    const textClasses = {
        slate: 'text-slate-900',
        green: 'text-emerald-700',
        indigo: 'text-indigo-700',
        blue: 'text-blue-700',
    };

    return (
        <div className={`rounded-xl p-2.5 border transition-all ${colorClasses[color]}`}>
            <p className={`text-sm font-black ${textClasses[color]}`}>{value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [analyticsModal, setAnalyticsModal] = useState(null); // filter string
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isUploadingWork, setIsUploadingWork] = useState(false);
    const [recentUploads, setRecentUploads] = useState([]);

    const fetchDashboard = async () => {
        try {
            const [dashRes, uploadsRes] = await Promise.all([
                api.get('/dashboard/analytics'),
                api.get('/reports')
            ]);
            setData(dashRes.data);
            setRecentUploads(uploadsRes.data);
        } catch (err) {
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReportSubmit = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmittingReport(true);
        const formData = new FormData();
        formData.append('report', file);
        // Automatically attach to the first team if available
        if (data?.teams?.length > 0) {
            formData.append('teamId', data.teams[0].id);
        }

        const loadingToast = toast.loading(`Uploading ${file.name} to internal storage...`);
        try {
            await api.post('/reports/submit', formData);
            toast.success("Today's report submitted successfully!", { id: loadingToast });
            fetchDashboard(); // Refresh history
        } catch (err) {
            const errorDetail = err.response?.data?.error;
            const message = typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : (errorDetail || err.response?.data?.message || "Internal Server Error");
            toast.error(`Upload Error: ${message}`, { id: loadingToast, duration: 6000 });
        } finally {
            setIsSubmittingReport(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleWorkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingWork(true);
        const formData = new FormData();
        formData.append('work', file);
        // Automatically attach to the first team if available
        if (data?.teams?.length > 0) {
            formData.append('teamId', data.teams[0].id);
        }

        const loadingToast = toast.loading(`Uploading ${file.name} to internal storage...`);
        try {
            await api.post('/reports/work', formData);
            toast.success("Work uploaded successfully!", { id: loadingToast });
            fetchDashboard(); // Refresh history
        } catch (err) {
            const errorDetail = err.response?.data?.error;
            const message = typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : (errorDetail || err.response?.data?.message || "Internal Server Error");
            toast.error(`Upload Error: ${message}`, { id: loadingToast, duration: 6000 });
        } finally {
            setIsUploadingWork(false);
            // Reset input
            e.target.value = '';
        }
    };

    const canSubmitReport = user?.role === 'Member' || user?.role === 'Team Lead';

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (isLoading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
        </div>
    );

    if (!data) return (
        <div className="flex justify-center items-center h-64 text-slate-500">
            <p>No data available. Please try again.</p>
        </div>
    );

    const cards = [
        { key: 'total', label: 'Total Tasks', value: data.analytics.totalTasks, icon: AlertCircle, color: 'bg-slate-100 text-slate-600', textColor: 'text-slate-900' },
        { key: 'completed', label: 'Completed', value: data.analytics.completed, icon: CheckCircle2, color: 'bg-success-green/10 text-success-green', textColor: 'text-success-green' },
        { key: 'leadTime', label: 'Avg Lead Time', value: `${data.analytics.avgLeadTime}d`, icon: Clock, color: 'bg-indigo-100 text-indigo-600', textColor: 'text-indigo-600' },
        { key: 'throughput', label: 'Weekly Velocity', value: data.analytics.throughput, icon: ArrowUpRight, color: 'bg-primary-blue/10 text-primary-blue', textColor: 'text-primary-blue' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.name} 👋</p>
                </div>
                <div className="flex items-center space-x-4">
                    {canSubmitReport && (
                        <div className="relative">
                            <input
                                type="file"
                                id="report-upload"
                                className="hidden"
                                onChange={handleReportSubmit}
                                disabled={isSubmittingReport}
                            />
                            <label
                                htmlFor="report-upload"
                                className={`flex items-center px-4 py-2 bg-primary-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-blue/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all cursor-pointer ${isSubmittingReport ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                {isSubmittingReport ? 'Submitting...' : "Submit Today's Report"}
                                <Upload className="w-3.5 h-3.5 ml-2 opacity-70" />
                            </label>
                        </div>
                    )}
                    {canSubmitReport && (
                        <div className="relative">
                            <input
                                type="file"
                                id="work-upload"
                                className="hidden"
                                onChange={handleWorkUpload}
                                disabled={isUploadingWork}
                            />
                            <label
                                htmlFor="work-upload"
                                className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all cursor-pointer ${isUploadingWork ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {isUploadingWork ? 'Uploading...' : "Upload Work"}
                                <Upload className="w-3.5 h-3.5 ml-2 opacity-70" />
                            </label>
                        </div>
                    )}
                    <p className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hidden md:block">Click any stat card to see team breakdown</p>
                </div>
            </div>

            {/* Analytics Cards – Clickable */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map(card => (
                    <button
                        key={card.key}
                        onClick={() => setAnalyticsModal(card.key)}
                        className="card flex items-center p-5 text-left hover:shadow-md hover:-translate-y-0.5 transform transition-all cursor-pointer group"
                    >
                        <div className={`p-3 rounded-full ${card.color} mr-4 group-hover:scale-110 transition-transform`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{card.label}</p>
                            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Boards Overview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="flex items-center mb-4">
                            <Users className="w-5 h-5 mr-2 text-slate-500" />
                            <h2 className="text-lg font-semibold text-slate-800">Team Boards Overview</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Team</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Active Sprint</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {data.teams.length === 0 && (
                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">No teams found.</td></tr>
                                    )}
                                    {data.teams.map(team => (
                                        <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-900">{team.name}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {team.activeSprint}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                <Link to={`/teams/${team.id}/sprint-board`} className="text-primary-blue hover:text-blue-900">Sprint Board</Link>
                                                <Link to={`/teams/${team.id}/kanban`} className="text-primary-blue hover:text-blue-900">Kanban</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="card">
                        <div className="flex items-center mb-4">
                            <PlayCircle className="w-5 h-5 mr-2 text-slate-500" />
                            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
                        </div>
                        {data.timeline.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No recent activity.</p>
                        ) : (
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    {data.timeline.map((event, idx) => (
                                        <li key={event.id}>
                                            <div className="relative pb-8">
                                                {idx !== data.timeline.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" />}
                                                <div className="relative flex space-x-3">
                                                    <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                                    </span>
                                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                        <p className="text-sm text-slate-500">{event.text}</p>
                                                        <p className="whitespace-nowrap text-sm text-slate-400">{event.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Deadline Alerts */}
                <div className="space-y-6">
                    <div className="card border-l-4 border-l-danger-red">
                        <div className="flex items-center mb-4">
                            <AlertCircle className="w-5 h-5 mr-2 text-danger-red" />
                            <h2 className="text-lg font-semibold text-slate-800">Deadline Alerts</h2>
                        </div>
                        <ul className="space-y-3">
                            {data.alerts.map(alert => (
                                <li key={alert.id} className={`p-3 rounded-md text-sm cursor-pointer hover:opacity-80 transition-opacity ${alert.type === 'overdue' ? 'bg-danger-red/10 text-danger-red' : 'bg-warning-amber/10 text-warning-amber'}`}>
                                    <Link to={alert.link} className="block w-full">{alert.message}</Link>
                                </li>
                            ))}
                            {data.alerts.length === 0 && <p className="text-sm text-slate-500">No active alerts. Great work! 🎉</p>}
                        </ul>
                    </div>

                    {/* Structured Uploads History */}
                    <div className="card">
                        <div className="flex items-center mb-4 text-emerald-600">
                            <FileText className="w-5 h-5 mr-2" />
                            <h2 className="text-lg font-semibold text-slate-800">Recent Uploads</h2>
                        </div>
                        <div className="space-y-4">
                            {recentUploads.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No recent uploads found.</p>
                            ) : (
                                recentUploads.slice(0, 5).map(upload => (
                                    <div key={upload.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate">{upload.file_name}</p>
                                            <div className="flex items-center mt-1 space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className={`px-1.5 py-0.5 rounded ${upload.file_type === 'Report' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {upload.file_type}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(upload.uploaded_at).toLocaleDateString()}</span>
                                                {upload.team_name && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-slate-500">{upload.team_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <a 
                                            href={upload.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="ml-4 p-2 text-slate-400 hover:text-primary-blue hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Analytics Modal */}
            <TeamAnalyticsModal
                isOpen={!!analyticsModal}
                onClose={() => setAnalyticsModal(null)}
                filter={analyticsModal}
                teamData={data.teams}
            />
        </div>
    );
};

export default Dashboard;
