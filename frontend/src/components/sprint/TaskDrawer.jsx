import { useState, useEffect } from 'react';
import { X, Clock, Paperclip, Link as LinkIcon, MessageSquare, Plus, Trash2, Tag, Flag, Hash, User, FolderOpen, Loader2, Edit3, History } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';

const TaskDrawer = ({ isOpen, onClose, task, onTaskUpdated, onEdit }) => {
    const { teamId: paramTeamId } = useParams();
    const teamId = task?.team_id || paramTeamId;

    const [activeTab, setActiveTab] = useState('details');
    const [timeLogs, setTimeLogs] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [comments, setComments] = useState([]);
    const [links, setLinks] = useState([]);
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!isOpen || !task || !teamId) return;

        const fetchData = async () => {
            try {
                setLoadingData(true);
                // Basic data needed for dropdowns
                const [memRes, projRes] = await Promise.all([
                    api.get(`/teams/${teamId}/members`),
                    api.get(`/teams/${teamId}/projects`)
                ]);
                setMembers(memRes.data);
                setProjects(projRes.data);

                // Tab specific data
                if (activeTab === 'comments') {
                    const { data } = await api.get(`/teams/${teamId}/tasks/${task.id}/comments`);
                    setComments(data);
                } else if (activeTab === 'time') {
                    const { data } = await api.get(`/teams/${teamId}/tasks/${task.id}/time-logs`);
                    setTimeLogs(data || []);
                } else if (activeTab === 'attachments') {
                    const { data } = await api.get(`/teams/${teamId}/tasks/${task.id}/attachments`);
                    setAttachments(data || []);
                } else if (activeTab === 'links') {
                    const { data } = await api.get(`/teams/${teamId}/tasks/${task.id}/links`);
                    setLinks(data || []);
                } else if (activeTab === 'history') {
                    const { data } = await api.get(`/teams/${teamId}/tasks/${task.id}/history`);
                    setHistory(data || []);
                }
            } catch (err) {
                console.error("Failed to fetch task sub-data:", err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [isOpen, task?.id, activeTab, teamId]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsUploading(true);
            const { data } = await api.post(`/teams/${teamId}/tasks/${task.id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments(prev => [data, ...prev]);
            toast.success("File uploaded successfully");
        } catch (err) {
            toast.error(err.response?.data?.message || "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        try {
            const { data } = await api.post(`/teams/${teamId}/tasks/${task.id}/comments`, { content: newComment });
            setComments(prev => [...prev, data]);
            setNewComment('');
            toast.success("Comment posted");
        } catch (err) {
            toast.error("Failed to post comment");
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        if (!newLinkUrl.trim()) return;
        try {
            const { data } = await api.post(`/teams/${teamId}/tasks/${task.id}/links`, { title: newLinkTitle, url: newLinkUrl });
            setLinks(prev => [data, ...prev]);
            setNewLinkTitle('');
            setNewLinkUrl('');
            toast.success("Link added");
        } catch (err) {
            toast.error("Failed to add link");
        }
    };

    const handleDeleteLink = async (linkId) => {
        try {
            await api.delete(`/teams/${teamId}/tasks/${task.id}/links/${linkId}`);
            setLinks(prev => prev.filter(l => l.id !== linkId));
            toast.success("Link removed");
        } catch (err) {
            toast.error("Failed to remove link");
        }
    };

    const handleUpdateField = async (field, value) => {
        try {
            const { data } = await api.put(`/teams/${teamId}/tasks/${task.id}`, { [field]: value });
            if (onTaskUpdated) onTaskUpdated(data);
            toast.success("Task updated");
        } catch (err) {
            toast.error("Failed to update task");
        }
    };

    if (!isOpen || !task) return null;

    const taskProject = projects.find(p => p.id === task.project_id);

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-lg">TASK-{task.id}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                        ${task.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' :
                            task.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                                'bg-primary-blue/10 text-primary-blue'}`}>
                        {task.priority || 'Medium'}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(task)}
                            className="text-slate-400 hover:text-primary-blue hover:bg-primary-blue/5 p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold"
                        >
                            <Edit3 className="w-4 h-4" /> EDIT
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Title & Nav */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
                <h2 className="text-xl font-bold text-slate-900 mb-4">{task.title}</h2>

                <div className="flex space-x-6 border-b border-slate-100 text-sm overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'details', label: 'Details', icon: Tag },
                        { id: 'attachments', label: 'Files', icon: Paperclip },
                        { id: 'links', label: 'Links', icon: LinkIcon },
                        { id: 'comments', label: 'Comments', icon: MessageSquare },
                        { id: 'time', label: 'Time Tracking', icon: Clock },
                        { id: 'history', label: 'History', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 font-semibold flex items-center gap-2 transition-colors whitespace-nowrap
                                ${activeTab === tab.id ? 'border-b-2 border-primary-blue text-primary-blue' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {loadingData && activeTab !== 'details' ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2">
                        <Loader2 className="w-8 h-8 text-primary-blue animate-spin" />
                        <p className="text-sm text-slate-400">Loading {activeTab}...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'details' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                                    <div className="text-sm text-slate-600 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed min-h-[100px]">
                                        {task.description || 'No description provided.'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Assignee</label>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600 uppercase">
                                                    {(members.find(m => m.id === task.assignee_id)?.name || 'U').charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">
                                                    {members.find(m => m.id === task.assignee_id)?.name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Project</label>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <FolderOpen className="w-4 h-4 text-amber-500" />
                                                {taskProject?.name || 'No Project'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Story Points</label>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <Hash className="w-4 h-4 text-slate-400" />
                                                {task.story_points || 0} pts
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border
                                                ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    task.status === 'In Progress' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                                        'bg-slate-50 text-slate-700 border-slate-100'}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Created</span>
                                        <span>Updated</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-sm font-medium text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                                            {task.created_at ? new Date(task.created_at).toLocaleString() : 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Edit3 className="w-3.5 h-3.5 text-slate-300" />
                                            {task.updated_at ? new Date(task.updated_at).toLocaleString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'attachments' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <label className="relative group border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white hover:bg-slate-50 hover:border-primary-blue/30 transition-all cursor-pointer block">
                                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 text-primary-blue animate-spin mb-2" />
                                            <p className="text-sm font-bold text-slate-900">Uploading...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                <Paperclip className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">Attach any file</p>
                                            <p className="text-xs text-slate-500 mt-1">Maximum file size: 50MB</p>
                                        </>
                                    )}
                                </label>

                                <div className="space-y-3">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Uploaded Files ({attachments.length})</h4>
                                    {attachments.map(file => (
                                        <div key={file.id} className="bg-white p-3.5 flex items-center justify-between rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                                            <div className="flex items-center min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center mr-3 flex-shrink-0">
                                                    <Paperclip className="w-5 h-5" />
                                                </div>
                                                <div className="truncate">
                                                    <a href={file.file_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-800 hover:text-primary-blue truncate block">
                                                        {file.file_name}
                                                    </a>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">{new Date(file.uploaded_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {attachments.length === 0 && !isUploading && (
                                        <div className="text-center py-10">
                                            <p className="text-sm text-slate-400">No attachments found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'links' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Add External Link</h4>
                                    <form onSubmit={handleAddLink} className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Link Title (e.g., Figma, PR, Doc)"
                                            className="input-field text-sm w-full"
                                            value={newLinkTitle}
                                            onChange={(e) => setNewLinkTitle(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://..."
                                                className="input-field text-sm flex-1"
                                                value={newLinkUrl}
                                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                            />
                                            <button type="submit" className="btn-primary py-1.5 px-4 text-xs">Add</button>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Task Links ({links.length})</h4>
                                    {links.map(link => (
                                        <div key={link.id} className="bg-white p-3.5 flex items-center justify-between rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                                            <div className="flex items-center min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mr-3 flex-shrink-0">
                                                    <LinkIcon className="w-4 h-4" />
                                                </div>
                                                <div className="truncate">
                                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-800 hover:text-primary-blue truncate block">
                                                        {link.title}
                                                    </a>
                                                    <p className="text-[10px] text-slate-400 truncate">{link.url}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteLink(link.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {links.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-sm text-slate-400">No links added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'comments' && (
                            <div className="flex flex-col h-full animate-in fade-in duration-300">
                                <div className="flex-1 space-y-6 pb-24">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex gap-4">
                                            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 border-2 border-white shadow-sm uppercase">
                                                {(comment.user_name || 'M').charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-sm font-bold text-slate-900">{comment.user_name || 'Member'}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">• {new Date(comment.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                                                    <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {comments.length === 0 && (
                                        <p className="text-center text-slate-400 py-10 text-sm">No comments yet. Start a discussion!</p>
                                    )}
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <div className="relative">
                                        <textarea
                                            className="w-full input-field text-sm min-h-[100px] pr-20 pt-4 resize-none"
                                            placeholder="Write your comment..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!newComment.trim()}
                                            className="absolute right-3 bottom-3 btn-primary py-1.5 px-4 text-xs disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'time' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logged Hours</h4>
                                    <button className="text-xs font-bold text-primary-blue hover:bg-primary-blue/5 px-2 py-1 rounded-lg flex items-center transition-colors">
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Log
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {timeLogs.map(log => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">LOG</div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{log.user}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{log.date}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-primary-blue/5 text-primary-blue rounded-lg text-sm font-black">
                                                {log.hours}h
                                            </div>
                                        </div>
                                    ))}
                                    {timeLogs.length === 0 && (
                                        <p className="text-center text-slate-400 py-10 text-sm font-medium">No time logs recorded.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                    {history.map((item) => (
                                        <div key={item.id} className="relative">
                                            <div className="absolute -left-[14.5px] top-1 w-3 h-3 rounded-full bg-white border-2 border-primary-blue z-10" />
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white uppercase">
                                                        {(item.user_name || 'U').charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-900">{item.user_name}</span>
                                                    <span className="text-[10px] text-slate-400 ml-auto uppercase font-black">{new Date(item.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">
                                                    Updated <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md">{item.field_changed}</span> from
                                                    <span className="mx-1 text-rose-500 font-medium">"{item.old_value || 'None'}"</span>
                                                    to
                                                    <span className="mx-1 text-emerald-600 font-bold">"{item.new_value}"</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {history.length === 0 && (
                                        <div className="text-center py-20">
                                            <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400">No history records yet.</p>
                                            <p className="text-[11px] text-slate-300 uppercase font-bold mt-1">Updates will appear here as they happen</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={onClose} className="btn-ghost text-sm px-6">Close</button>
            </div>
        </div>
    );
};

export default TaskDrawer;
