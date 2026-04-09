import { Filter, Search, Settings2, SlidersHorizontal } from 'lucide-react';

const BoardControls = ({
    boardConfig,
    members = [],
    filterState,
    onFilterChange,
    activeQuickFilterId,
    onQuickFilterPick,
    onOpenSettings,
    canManage
}) => {
    const quickFiltersEnabled = boardConfig?.settings?.enable_quick_filters && boardConfig?.feature_flags?.boardQuickFiltersEnabled;
    const swimlanesEnabled = boardConfig?.feature_flags?.boardSwimlanesEnabled;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                <div className="lg:col-span-4 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        value={filterState.search}
                        onChange={(e) => onFilterChange({ search: e.target.value })}
                        placeholder="Search task title..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue outline-none"
                    />
                </div>
                <div className="lg:col-span-2">
                    <select
                        value={filterState.type}
                        onChange={(e) => onFilterChange({ type: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                        <option value="">All Types</option>
                        <option value="Task">Task</option>
                        <option value="Bug">Bug</option>
                        <option value="Feature">Feature</option>
                        <option value="Story">Story</option>
                    </select>
                </div>
                <div className="lg:col-span-2">
                    <select
                        value={filterState.priority}
                        onChange={(e) => onFilterChange({ priority: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
                <div className="lg:col-span-2">
                    <select
                        value={filterState.assignee_id}
                        onChange={(e) => onFilterChange({ assignee_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                        <option value="">All Assignees</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
                <div className="lg:col-span-2 flex gap-2">
                    {swimlanesEnabled && (
                        <select
                            value={filterState.swimlane_mode}
                            onChange={(e) => onFilterChange({ swimlane_mode: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                            title="Swimlane grouping"
                        >
                            <option value="none">No Swimlane</option>
                            <option value="assignee">By Assignee</option>
                            <option value="priority">By Priority</option>
                            <option value="type">By Type</option>
                        </select>
                    )}
                    {canManage && (
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                            title="Board settings"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {quickFiltersEnabled && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 mr-1" /> Quick Filters
                    </span>
                    {(boardConfig?.quick_filters || []).map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onQuickFilterPick(filter)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border ${activeQuickFilterId === filter.id
                                ? 'bg-primary-blue text-white border-primary-blue'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {filter.name}
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            onQuickFilterPick(null);
                            onFilterChange({ search: '', type: '', priority: '', assignee_id: '' });
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-bold border bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
};

export default BoardControls;
