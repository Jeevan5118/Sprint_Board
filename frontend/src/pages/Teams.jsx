import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Users, ChevronRight, LayoutGrid, Zap } from 'lucide-react';

const Teams = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isAdmin = user?.role === 'Admin';

    const fetchTeams = async () => {
        try {
            const { data } = await api.get('/teams');
            setTeams(data);
        } catch (err) {
            toast.error('Failed to load teams');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchTeams(); }, []);

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data } = await api.post('/teams', form);
            setTeams(prev => [...prev, { ...data, members_count: 1 }]);
            setIsModalOpen(false);
            setForm({ name: '', description: '' });
            toast.success('Team created!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create team');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTeam = async (id) => {
        if (!window.confirm('Delete this team and all its data?')) return;
        try {
            await api.delete(`/teams/${id}`);
            setTeams(teams.filter(t => t.id !== id));
            toast.success('Team deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete team');
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage organization teams and members.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center">
                        <Plus className="w-4 h-4 mr-2" /> Create Team
                    </button>
                )}
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.length === 0 && (
                    <div className="col-span-3 card text-center py-16 text-slate-400">
                        <Users className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                        <p className="font-semibold">No teams yet</p>
                        <p className="text-sm mt-1">Create your first team to get started.</p>
                    </div>
                )}
                {teams.map(team => (
                    <div key={team.id} className="card hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="h-10 w-10 bg-primary-blue/10 rounded-xl flex items-center justify-center mr-3">
                                    <Users className="h-5 w-5 text-primary-blue" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{team.name}</h3>
                                    <p className="text-xs text-slate-400">{team.description || 'No description'}</p>
                                </div>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-300 hover:text-danger-red opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500">Members</p>
                                <p className="text-lg font-bold text-slate-900">{team.members_count || 0}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500">Team Lead</p>
                                <p className="text-sm font-medium text-slate-700 truncate">{team.lead_name || '—'}</p>
                            </div>
                        </div>

                        {team.active_sprint && (
                            <div className="flex items-center text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">
                                <Zap className="w-3 h-3 mr-1.5" />
                                Active: {team.active_sprint}
                            </div>
                        )}

                        <div className="flex flex-col space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center space-x-2">
                                <Link to={`/teams/${team.id}/sprint-board`} className="flex-1 btn-primary py-1.5 text-xs text-center flex items-center justify-center">
                                    <Zap className="w-3.5 h-3.5 mr-1" /> Sprint Board
                                </Link>
                                <Link to={`/teams/${team.id}/kanban`} className="flex-1 btn-secondary py-1.5 text-xs text-center flex items-center justify-center">
                                    <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Kanban
                                </Link>
                            </div>
                            <Link to={`/teams/${team.id}`} className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-primary-blue transition-colors py-1">
                                View Team Details & Members
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Team Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Team</h3>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <div>
                                <label className="label-field">Team Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="e.g. Engineering Platform" />
                            </div>
                            <div>
                                <label className="label-field">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="What does this team do?" />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Creating...' : 'Create Team'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;
