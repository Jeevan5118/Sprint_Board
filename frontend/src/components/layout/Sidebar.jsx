import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, KanbanSquare, Calendar, Bell, Settings, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { user } = useAuth();
    const canManageData = user?.role === 'Admin' || user?.role === 'Team Lead';

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Teams', path: '/teams', icon: Users },
        { name: 'Projects', path: '/projects', icon: FolderKanban },
        { name: 'Timeline', path: '/timeline', icon: Calendar },
        { name: 'Notifications', path: '/notifications', icon: Bell },
    ];

    const bottomItems = [
        ...(canManageData ? [{ name: 'Import Data', path: '/admin/import', icon: Database }] : []),
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    const navClass = ({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-primary-blue text-white shadow-md shadow-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`;

    return (
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full hidden md:flex sticky top-0">
            <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white z-10">
                <div className="w-8 h-8 bg-primary-blue rounded-lg flex items-center justify-center mr-3">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sprint Board</h1>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col space-y-1">
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</div>
                {navItems.map((item) => (
                    <NavLink key={item.name} to={item.path} className={navClass}>
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                    </NavLink>
                ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support & Tools</div>
                {bottomItems.map((item) => (
                    <NavLink key={item.name} to={item.path} className={navClass}>
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
