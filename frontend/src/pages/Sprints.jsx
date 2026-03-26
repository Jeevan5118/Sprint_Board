import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Play, CheckCircle, Calendar, Plus, LayoutTemplate, X } from 'lucide-react';

const Sprints = () => {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [sprints, setSprints] = useState([]);
    const [team, setTeam] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
    const canManage = user?.role === 'Admin' || user?.role === 'Team Lead';

    const fetchData = async () => {
        try {
            const [teamRes, sprintsRes] = await Promise.all([
                api.get(`/teams/${teamId}`),
                api.get(`/teams/${teamId}/sprints`)
            ]);
            setTeam(teamRes.data);
            setSprints(sprintsRes.data);
        } catch {
            toast.error('Failed to load sprint data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreateSprint = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data } = await api.post(`/teams/${teamId}/sprints`, form);
            setSprints(prev => [data, ...prev]);
            setShowModal(false);
            setForm({ name: '', start_date: '', end_date: '' });
            toast.success('Sprint created!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create sprint');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartSprint = async (id) => {
        try {
            const { data } = await api.put(`/teams/${teamId}/sprints/${id}/start`);
            setSprints(prev => prev.map(s => s.id === id ? data : s));
            toast.success('Sprint started!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleCompleteSprint = async (id) => {
        if (!window.confirm('Complete this sprint?')) return;
        try {
            const { data } = await api.put(`/teams/${teamId}/sprints/${id}/complete`);
            setSprints(prev => prev.map(s => s.id === id ? data : s));
            toast.success('Sprint completed!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to complete sprint');
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sprints</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage timeboxes for {team?.name}</p>
                </div>
                {canManage && (
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
                        <Plus className="w-4 h-4 mr-2" /> Create Sprint
                    </button>
                )}
            </div>

            <div className="card overflow-hidden p-0">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sprint Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dates</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {sprints.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">No sprints yet. Create one to get started!</td></tr>
                        )}
                        {sprints.map(sprint => (
                            <tr key={sprint.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">{sprint.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${sprint.status === 'Active' ? 'bg-primary-blue/10 text-primary-blue' :
                                            sprint.status === 'Completed' ? 'bg-success-green/10 text-success-green' :
                                                'bg-slate-100 text-slate-600'}`}>
                                        {sprint.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="flex items-center text-sm text-slate-700 font-medium">
                                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                            {sprint.start_date ? `${new Date(sprint.start_date).toLocaleDateString()} — ${sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'TBD'}` : 'Unscheduled'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black mt-1 ml-6">
                                            Created {new Date(sprint.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    {sprint.status === 'Planned' && canManage && (
                                        <button onClick={() => handleStartSprint(sprint.id)} className="text-primary-blue hover:text-blue-900 inline-flex items-center">
                                            <Play className="w-4 h-4 mr-1" /> Start
                                        </button>
                                    )}
                                    {sprint.status === 'Active' && canManage && (
                                        <button onClick={() => handleCompleteSprint(sprint.id)} className="text-success-green hover:text-green-900 inline-flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-1" /> Complete
                                        </button>
                                    )}
                                    {sprint.status === 'Active' && (
                                        <Link to={`/teams/${teamId}/sprint-board`} className="btn-secondary py-1 text-xs inline-flex items-center">
                                            <LayoutTemplate className="w-3 h-3 mr-1" /> Board
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Sprint Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Create Sprint</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleCreateSprint} className="space-y-4">
                            <div>
                                <label className="label-field">Sprint Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="Sprint 1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-field">Start Date</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="label-field">End Date</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-field" />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Creating...' : 'Create Sprint'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sprints;
