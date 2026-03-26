import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Users, Folder, Search, UserPlus, Settings, Trash2, ArrowLeft, ChevronUp } from 'lucide-react';

const TeamDetails = () => {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const isAdminOrLead = user?.role === 'Admin' || user?.role === 'Team Lead';

    const fetchData = async () => {
        try {
            const [teamRes, membersRes, projectsRes] = await Promise.all([
                api.get(`/teams/${teamId}`),
                api.get(`/teams/${teamId}/members`),
                api.get(`/teams/${teamId}/projects`)
            ]);
            setTeam(teamRes.data);
            setMembers(membersRes.data);
            setProjects(projectsRes.data);
        } catch (err) {
            toast.error('Failed to load team data');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/users');
            setAllUsers(res.data);
        } catch { /* non-admin users won't have access */ }
    };

    useEffect(() => {
        fetchData();
        if (user?.role === 'Admin') fetchAllUsers();
    }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Remove this member from the team?')) return;
        try {
            await api.delete(`/teams/${teamId}/members/${memberId}`);
            setMembers(members.filter(m => m.id !== memberId));
            toast.success('Member removed');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handlePromote = async (memberId) => {
        if (!window.confirm('Promote this member to Team Lead?')) return;
        try {
            await api.put(`/teams/${teamId}/members/${memberId}/promote`);
            toast.success('Member promoted to Team Lead');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to promote member');
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) return;
        try {
            await api.post(`/teams/${teamId}/members`, { user_id: selectedUserId });
            toast.success('Member added to team');
            setShowAddModal(false);
            setSelectedUserId('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add member');
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;

    if (!team) return <div className="p-8 text-center text-slate-500">Team not found.</div>;

    // Filter out users already in team for the add modal
    const memberIds = new Set(members.map(m => m.id));
    const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Link to="/teams" className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Teams
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">{team.description || 'No description'}</p>
                    </div>
                    <div className="flex space-x-2">
                        <Link to={`/teams/${teamId}/sprints`} className="btn-secondary flex items-center text-sm">
                            <Settings className="w-4 h-4 mr-2" /> Manage Sprints
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <Users className="w-8 h-8 text-primary-blue bg-blue-50 p-1.5 rounded-lg mr-4" />
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Members</p>
                        <p className="text-xl font-bold text-slate-900">{members.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <Folder className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-lg mr-4" />
                    <div>
                        <p className="text-sm font-medium text-slate-500">Active Projects</p>
                        <p className="text-xl font-bold text-slate-900">{projects.length}</p>
                    </div>
                </div>
            </div>

            {/* Members Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-slate-500" /> Team Members
                    </h2>
                    {isAdminOrLead && (
                        <button onClick={() => setShowAddModal(true)} className="btn-primary py-1.5 flex items-center text-sm">
                            <UserPlus className="w-4 h-4 mr-2" /> Add Member
                        </button>
                    )}
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            {isAdminOrLead && <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {members.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-6 text-center text-sm text-slate-400">No members yet.</td></tr>
                        )}
                        {members.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                            {member.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-slate-900">{member.name}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.role === 'Team Lead' ? 'bg-amber-100 text-amber-800' : member.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {member.role}
                                    </span>
                                </td>
                                {isAdminOrLead && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        {member.role === 'Member' && (
                                            <button onClick={() => handlePromote(member.id)} className="text-amber-500 hover:text-amber-700 inline-flex items-center">
                                                <ChevronUp className="w-3.5 h-3.5 mr-1" /> Promote
                                            </button>
                                        )}
                                        {member.id !== user?.id && (
                                            <button onClick={() => handleRemoveMember(member.id)} className="text-danger-red hover:text-rose-900">
                                                <Trash2 className="w-4 h-4 inline" />
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Projects Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mt-6">
                <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                        <Folder className="w-5 h-5 mr-2 text-slate-500" /> Attached Projects
                    </h2>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {projects.length === 0 && (
                            <tr><td colSpan={2} className="px-6 py-6 text-center text-sm text-slate-400">No projects yet.</td></tr>
                        )}
                        {projects.map(proj => (
                            <tr key={proj.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{proj.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link to={`/projects/${proj.id}`} className="text-primary-blue hover:text-blue-900">Open Project</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Add Member to Team</h3>
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="input-field w-full mb-4"
                        >
                            <option value="">Select a user...</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleAddMember} className="btn-primary">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamDetails;
