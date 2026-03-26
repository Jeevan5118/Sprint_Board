import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, Search, LayoutTemplate, SquareKanban, ArrowLeft, Plus } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import TaskDrawer from '../components/sprint/TaskDrawer';
import TaskModal from '../components/sprint/TaskModal';

const ProjectDetails = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                // We need a specific project endpoint or filter tasks by project_id
                // Since project routes are scoped /teams/:teamId/projects, we might need a better way if we only have projectId
                // For now, let's try to get projects from /projects and find our one
                const projectsRes = await api.get('/projects');
                const found = projectsRes.data.find(p => p.id === projectId);
                
                if (found) {
                    setProject(found);
                    // Now fetch tasks for this project
                    // Task API supports sprint_id, status, assignee_id but not project_id yet in req.query
                    // Let's fetch all tasks for the team and filter locally or update backend
                    const tasksRes = await api.get(`/teams/${found.team_id}/tasks`);
                    setTasks(tasksRes.data.filter(t => t.project_id === found.id));
                }
            } catch {
                toast.error('Failed to load project details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectDetails();
    }, [projectId]);

    const filteredTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleTaskSaved = (savedTask, isEdit) => {
        if (isEdit) {
            setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
        } else {
            setTasks(prev => [savedTask, ...prev]);
        }
        setIsModalOpen(false);
    };

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;
    if (!project) return <div className="p-8 text-center text-slate-500">Project not found.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Link to="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Team: <Link to={`/teams/${project.team_id}`} className="text-primary-blue hover:underline font-medium">{project.team_name}</Link>
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <Link to={`/teams/${project.team_id}/sprint-board`} className="btn-secondary flex items-center">
                            <LayoutTemplate className="w-4 h-4 mr-2 text-indigo-600" /> Sprint Board
                        </Link>
                        <Link to={`/teams/${project.team_id}/kanban`} className="btn-secondary flex items-center">
                            <SquareKanban className="w-4 h-4 mr-2 text-emerald-600" /> Kanban Board
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-slate-600 leading-relaxed">{project.description || 'No description provided for this project.'}</p>
            </div>

            {/* Project Tasks */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mt-6">
                <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                        <Layers className="w-5 h-5 mr-2 text-slate-500" /> Project Tasks
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search tasks..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-blue/20 focus:outline-none w-full sm:w-64" 
                            />
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary py-1.5 flex items-center text-sm justify-center"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Create Task
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        {searchQuery ? 'No tasks match your search.' : 'No tasks associated with this project yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map(task => (
                                    <tr 
                                        key={task.id} 
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{task.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                                ${task.status === 'Done' ? 'bg-green-100 text-green-800' :
                                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-slate-100 text-slate-600'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs font-bold
                                                ${task.priority === 'Urgent' ? 'text-rose-600' :
                                                  task.priority === 'High' ? 'text-amber-600' :
                                                  'text-slate-500'}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {task.assignee_name || (task.assignee_id ? `User ${task.assignee_id}` : 'Unassigned')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TaskDrawer 
                isOpen={!!selectedTask} 
                onClose={() => setSelectedTask(null)} 
                task={selectedTask} 
            />
            {selectedTask && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={() => setSelectedTask(null)} />}

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={handleTaskSaved}
                teamId={project.team_id}
                editTask={null}
                // Pre-select project_id in TaskModal if we add that prop or logic
            />
        </div>
    );
};

export default ProjectDetails;
