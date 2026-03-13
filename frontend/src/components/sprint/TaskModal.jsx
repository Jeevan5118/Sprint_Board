import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { X, User, Flag, Tag, Calendar, Hash, FolderOpen } from 'lucide-react';

const TYPES = ['Task', 'Bug', 'Feature', 'Story'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

const TaskModal = ({ isOpen, onClose, onSaved, teamId, sprintId = null, editTask = null }) => {
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
        assignee_id: '',
        due_date: '',
        project_id: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        // Fetch members and projects for this team
        Promise.all([
            api.get(`/teams/${teamId}/members`),
            api.get(`/teams/${teamId}/projects`)
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
                assignee_id: editTask.assignee_id || '',
                due_date: editTask.due_date ? editTask.due_date.split('T')[0] : '',
                project_id: editTask.project_id || ''
            });
        } else {
            setForm({ title: '', description: '', type: 'Task', priority: 'Medium', status: 'To Do', story_points: '', assignee_id: '', due_date: '', project_id: '' });
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
                assignee_id: form.assignee_id || null,
                project_id: form.project_id || null
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
                    <div className="grid grid-cols-3 gap-3">
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
                                {STATUSES.map(s => <option key={s}>{s}</option>)}
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

                    {/* Assignee, Story Points, Due Date */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="label-field flex items-center gap-1"><User className="w-3 h-3" /> Assignee</label>
                            <select value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })} className="input-field">
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
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
