import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { X, User, Flag, Tag, Calendar, Hash, FolderOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getColumnStatus } from '../../utils/boardStyles';

const TYPES = ['Task', 'Bug', 'Feature', 'Story'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

const TaskModal = ({ isOpen, onClose, onSaved, teamId, sprintId = null, editTask = null, isPowerHour = false, defaultProjectId = '', boardConfig = null }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        type: 'Task',
        priority: 'Medium',
        status: 'To Do',
        story_points: '',
        assignee_ids: [],
        due_date: '',
        project_id: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        // Fetch members and projects for this team
        Promise.all([
            api.get(`/teams/${teamId}/members${isPowerHour ? '?is_power_hour=true' : ''}`),
            api.get(`/teams/${teamId}/projects?is_power_hour=${isPowerHour}`)
        ]).then(([membersRes, projectsRes]) => {
            setMembers(membersRes.data);
            setProjects(projectsRes.data);
        }).catch(() => {});

        if (editTask) {
            setForm({
                title: editTask.title || '',
                description: editTask.description || '',
                type: editTask.type || 'Task',
                priority: editTask.priority || 'Medium',
                status: editTask.status || 'To Do',
                story_points: editTask.story_points || '',
                assignee_ids: editTask.assignee_ids?.length ? editTask.assignee_ids : (editTask.assignee_id ? [editTask.assignee_id] : []),
                due_date: editTask.due_date ? editTask.due_date.split('T')[0] : '',
                project_id: editTask.project_id || ''
            });
        } else {
            setForm({ 
                title: '', 
                description: '', 
                type: 'Task', 
                priority: 'Medium', 
                status: 'To Do', 
                story_points: '', 
                assignee_ids: [],
                due_date: '', 
                project_id: defaultProjectId || '' 
            });
        }
    }, [isOpen, editTask, teamId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { return; }
        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                story_points: form.story_points ? parseInt(form.story_points) : 0,
                sprint_id: sprintId || null,
                assignee_ids: form.assignee_ids || [],
                assignee_id: form.assignee_ids?.[0] || null,
                project_id: form.project_id || null,
                is_power_hour: isPowerHour
            };
            let resp;
            if (editTask) {
                resp = await api.put(`/teams/${teamId}/tasks/${editTask.id}`, payload);
            } else {
                resp = await api.post(`/teams/${teamId}/tasks`, payload);
            }
            onSaved(resp.data, !!editTask);
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const priorityColors = {
        Low: 'text-green-600', Medium: 'text-blue-600', High: 'text-orange-500', Urgent: 'text-red-600'
    };
    const statusOptions = (boardConfig?.columns || []).map(getColumnStatus).filter(Boolean);
    const availableStatuses = statusOptions.length > 0 ? [...new Set(statusOptions)] : STATUSES;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{editTask ? 'Edit Task' : 'Create Task'}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{editTask ? 'Update task details' : 'Add a new task to the board'}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="label-field">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            required
                            className="input-field text-base font-medium"
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label-field">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="input-field"
                            rows={3}
                            placeholder="Add more details, acceptance criteria, or notes..."
                        />
                    </div>

                    {/* Type, Priority, Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="label-field flex items-center gap-1"><Tag className="w-3 h-3" /> Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                                {TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-field flex items-center gap-1"><Flag className={`w-3 h-3 ${priorityColors[form.priority]}`} /> Priority</label>
                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={`input-field font-medium ${priorityColors[form.priority]}`}>
                                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Status</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                                {availableStatuses.map(s => (
                                    <option key={s} disabled={s === 'Done' && user?.role === 'Member' && !isPowerHour}>
                                        {s} {s === 'Done' && user?.role === 'Member' && !isPowerHour ? '(Review Req.)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Project */}
                    <div>
                        <label className="label-field flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Project (Optional)</label>
                        <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} className="input-field">
                            <option value="">No project assigned</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {/* Assignees, Story Points, Due Date */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="label-field flex items-center gap-1"><User className="w-3 h-3" /> Assignees</label>
                            <div className="border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                                {members.map(m => {
                                    const checked = form.assignee_ids.includes(m.id);
                                    return (
                                        <label key={m.id} className="flex items-center gap-2 py-1 text-xs text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                    const next = checked
                                                        ? form.assignee_ids.filter(id => id !== m.id)
                                                        : [...form.assignee_ids, m.id];
                                                    setForm({ ...form, assignee_ids: next });
                                                }}
                                            />
                                            <span>{m.name}</span>
                                        </label>
                                    );
                                })}
                                {members.length === 0 && <p className="text-xs text-slate-400">No members found</p>}
                            </div>
                        </div>
                        <div>
                            <label className="label-field flex items-center gap-1"><Hash className="w-3 h-3" /> Story Pts</label>
                            <input
                                type="number"
                                value={form.story_points}
                                onChange={e => setForm({ ...form, story_points: e.target.value })}
                                min="0" max="100"
                                className="input-field"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="label-field flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={e => setForm({ ...form, due_date: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !form.title.trim()} className="btn-primary min-w-[120px]">
                            {isSubmitting ? (
                                <span className="flex items-center justify-center"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>Saving...</span>
                            ) : (editTask ? 'Save Changes' : 'Create Task')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
