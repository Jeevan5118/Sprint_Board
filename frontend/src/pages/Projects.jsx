import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Folder, Plus, Trash2, ArrowRight, Users, CheckCircle2, X } from 'lucide-react';

const STATUS_COLORS = {
    'Active': 'bg-green-100 text-green-800',
    'Planning': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-slate-100 text-slate-600',
    'On Hold': 'bg-amber-100 text-amber-800',
};

const Projects = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', team_id: '' });
    const canCreate = user?.role === 'Admin' || user?.role === 'Team Lead';

    const fetchData = async () => {
        try {
            const [teamsRes, projectsRes] = await Promise.all([
                api.get('/teams'),
                api.get('/projects')
            ]);
            setTeams(teamsRes.data);
            setProjects(projectsRes.data);
        } catch {
            toast.error('Failed to load projects');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!form.team_id) { toast.error('Please select a team'); return; }
        setIsSubmitting(true);
        try {
            await api.post(`/teams/${form.team_id}/projects`, {
                name: form.name,
                description: form.description
            });
            // Re-fetch to get enriched data
            fetchData();
            setIsModalOpen(false);
            setForm({ name: '', description: '', team_id: '' });
            toast.success('Project created!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async (teamId, projId) => {
        if (!window.confirm('Delete this project?')) return;
        try {
            await api.delete(`/teams/${teamId}/projects/${projId}`);
            setProjects(prev => prev.filter(p => p.id !== projId));
            toast.success('Project deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete project');
        }
    };

    // Group projects by team
    const grouped = projects.reduce((acc, p) => {
        const key = p.team_name || 'Unknown Team';
        if (!acc[key]) acc[key] = { team_id: p.team_id, projects: [] };
        acc[key].projects.push(p);
        return acc;
    }, {});

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
                    <p className="text-sm text-slate-500 mt-1">{projects.length} projects across {Object.keys(grouped).length} teams</p>
                </div>
                {canCreate && (
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center">
                        <Plus className="w-4 h-4 mr-2" /> New Project
                    </button>
                )}
            </div>

            {projects.length === 0 ? (
                <div className="card text-center py-16 text-slate-400">
                    <Folder className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="font-semibold">No projects yet</p>
                    <p className="text-sm mt-1">Create your first project to get started.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([teamName, group]) => (
                        <div key={teamName}>
                            {/* Team Header */}
                            <div className="flex items-center mb-3">
                                <div className="h-7 w-7 bg-primary-blue/10 rounded-lg flex items-center justify-center mr-2">
                                    <Users className="h-4 w-4 text-primary-blue" />
                                </div>
                                <h2 className="text-base font-bold text-slate-800">{teamName}</h2>
                                <span className="ml-2 text-xs text-slate-400">{group.projects.length} project{group.projects.length !== 1 ? 's' : ''}</span>
                                <div className="ml-3 h-px flex-1 bg-slate-200"></div>
                            </div>

                            {/* Projects Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.projects.map(proj => {
                                    const total = parseInt(proj.tasks_count || 0);
                                    const done = parseInt(proj.completed_count || 0);
                                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                    return (
                                        <div key={proj.id} className="card hover:shadow-md transition-all group relative">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center">
                                                    <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
                                                        <Folder className="h-4 w-4 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900 text-sm leading-tight">{proj.name}</h3>
                                                        <p className="text-xs text-slate-400 mt-0.5">{proj.description || 'No description'}</p>
                                                    </div>
                                                </div>
                                                {canCreate && (
                                                    <button
                                                        onClick={() => handleDeleteProject(proj.team_id, proj.id)}
                                                        className="text-slate-300 hover:text-danger-red opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Progress */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>{done}/{total} tasks done</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                    <div
                                                        className="bg-success-green h-1.5 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[proj.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {proj.status || 'Active'}
                                                </span>
                                                <Link
                                                    to={`/projects/${proj.id}`}
                                                    className="text-xs text-primary-blue hover:text-blue-800 font-medium flex items-center"
                                                >
                                                    Open <ArrowRight className="w-3 h-3 ml-0.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900">New Project</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="label-field">Project Name *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="e.g. Authentication v2" />
                            </div>
                            <div>
                                <label className="label-field">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="What is this project about?" />
                            </div>
                            <div>
                                <label className="label-field">Assign to Team *</label>
                                <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })} required className="input-field">
                                    <option value="">Select team...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Creating...' : 'Create Project'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
