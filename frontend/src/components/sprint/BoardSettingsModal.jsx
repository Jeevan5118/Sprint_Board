import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const TABS = ['columns', 'colors', 'layout', 'filters', 'transitions'];

const BoardSettingsModal = ({
    isOpen,
    onClose,
    boardType,
    boardConfig,
    onSaveSettings,
    onSaveColumns,
    onSaveColors,
    onSaveTransitions,
    onCreateQuickFilter,
    onUpdateQuickFilter,
    onDeleteQuickFilter
}) => {
    const [activeTab, setActiveTab] = useState('columns');
    const [settingsDraft, setSettingsDraft] = useState(null);
    const [columnsDraft, setColumnsDraft] = useState([]);
    const [colorsDraft, setColorsDraft] = useState([]);
    const [transitionsDraft, setTransitionsDraft] = useState([]);
    const [newFilterName, setNewFilterName] = useState('');
    const [newFilterJson, setNewFilterJson] = useState('{}');

    useEffect(() => {
        if (!isOpen || !boardConfig) return;
        setSettingsDraft({ ...boardConfig.settings });
        setColumnsDraft((boardConfig.columns || []).map((c) => ({ ...c })));
        setColorsDraft((boardConfig.color_rules || []).map((r) => ({ ...r })));
        setTransitionsDraft((boardConfig.transition_rules || []).map((r) => ({ ...r })));
    }, [isOpen, boardConfig]);

    const groupedColors = useMemo(() => ({
        status: colorsDraft.filter((r) => r.dimension === 'status'),
        type: colorsDraft.filter((r) => r.dimension === 'type'),
        priority: colorsDraft.filter((r) => r.dimension === 'priority'),
    }), [colorsDraft]);

    if (!isOpen || !boardConfig || !settingsDraft) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Board Settings</h3>
                        <p className="text-xs text-slate-500 capitalize">{boardType} board customization</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 pt-3 border-b border-slate-100 flex gap-2 flex-wrap">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {activeTab === 'columns' && (
                        <div className="space-y-3">
                            {columnsDraft.map((col, index) => (
                                <div key={col.column_key} className="grid grid-cols-12 gap-3 items-center p-3 border border-slate-200 rounded-xl">
                                    <div className="col-span-3 text-xs font-bold text-slate-500 uppercase">{col.column_key}</div>
                                    <input
                                        className="col-span-5 input-field text-sm"
                                        value={col.display_name}
                                        onChange={(e) => {
                                            const next = [...columnsDraft];
                                            next[index].display_name = e.target.value;
                                            setColumnsDraft(next);
                                        }}
                                    />
                                    <input
                                        className="col-span-2 input-field text-sm"
                                        type="number"
                                        min="0"
                                        placeholder="WIP"
                                        value={col.wip_limit ?? ''}
                                        onChange={(e) => {
                                            const next = [...columnsDraft];
                                            next[index].wip_limit = e.target.value ? Number(e.target.value) : null;
                                            setColumnsDraft(next);
                                        }}
                                    />
                                    <label className="col-span-2 text-xs text-slate-500 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!col.is_done_column}
                                            onChange={(e) => {
                                                const next = columnsDraft.map((c, i) => ({ ...c, is_done_column: i === index ? e.target.checked : false }));
                                                setColumnsDraft(next);
                                            }}
                                        />
                                        Done
                                    </label>
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <button onClick={() => onSaveColumns(columnsDraft)} className="btn-primary">Save Columns</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'colors' && (
                        <div className="space-y-4">
                            {['status', 'type', 'priority'].map((dimension) => (
                                <div key={dimension}>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">{dimension} colors</h4>
                                    <div className="space-y-2">
                                        {groupedColors[dimension].map((rule, index) => (
                                            <div key={`${rule.dimension}-${rule.dimension_value}`} className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 rounded-lg">
                                                <div className="col-span-3 text-xs font-bold text-slate-700">{rule.dimension_value}</div>
                                                {['bg_color', 'text_color', 'border_color', 'badge_color'].map((field) => (
                                                    <div key={field} className="col-span-2 flex items-center gap-1">
                                                        <input
                                                            type="color"
                                                            value={rule[field]}
                                                            onChange={(e) => {
                                                                const next = [...colorsDraft];
                                                                const targetIndex = colorsDraft.findIndex((r) => r.dimension === dimension && r.dimension_value === rule.dimension_value);
                                                                next[targetIndex][field] = e.target.value;
                                                                setColorsDraft(next);
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-slate-400 uppercase">{field.replace('_color', '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setColorsDraft(boardConfig.color_rules.map((r) => ({ ...r })))}
                                    className="btn-secondary"
                                >
                                    Reset
                                </button>
                                <button onClick={() => onSaveColors(colorsDraft)} className="btn-primary">Save Colors</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Swimlane Mode</label>
                            <select
                                className="input-field"
                                value={settingsDraft.swimlane_mode}
                                onChange={(e) => setSettingsDraft({ ...settingsDraft, swimlane_mode: e.target.value })}
                            >
                                <option value="none">None</option>
                                <option value="assignee">Assignee</option>
                                <option value="priority">Priority</option>
                                <option value="type">Type</option>
                            </select>

                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mt-3">Card Fields</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['assignee', 'story_points', 'due_date', 'project', 'type', 'priority'].map((field) => (
                                    <label key={field} className="text-sm text-slate-700 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={settingsDraft.show_card_fields.includes(field)}
                                            onChange={(e) => {
                                                const set = new Set(settingsDraft.show_card_fields);
                                                if (e.target.checked) set.add(field); else set.delete(field);
                                                setSettingsDraft({ ...settingsDraft, show_card_fields: [...set] });
                                            }}
                                        />
                                        {field}
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <label className="text-sm text-slate-700 flex items-center gap-2">
                                    <input type="checkbox" checked={settingsDraft.enable_quick_filters} onChange={(e) => setSettingsDraft({ ...settingsDraft, enable_quick_filters: e.target.checked })} />
                                    Enable quick filters
                                </label>
                                <label className="text-sm text-slate-700 flex items-center gap-2">
                                    <input type="checkbox" checked={settingsDraft.enable_color_customization} onChange={(e) => setSettingsDraft({ ...settingsDraft, enable_color_customization: e.target.checked })} />
                                    Enable color customization
                                </label>
                                <label className="text-sm text-slate-700 flex items-center gap-2">
                                    <input type="checkbox" checked={settingsDraft.enable_transition_rules} onChange={(e) => setSettingsDraft({ ...settingsDraft, enable_transition_rules: e.target.checked })} />
                                    Enable transition rules
                                </label>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={() => onSaveSettings(settingsDraft)} className="btn-primary">Save Layout</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'filters' && (
                        <div className="space-y-3">
                            {(boardConfig.quick_filters || []).map((filter) => (
                                <div key={filter.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{filter.name}</p>
                                        <p className="text-[11px] text-slate-500">{JSON.stringify(filter.filter_json)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onUpdateQuickFilter(filter.id, filter)} className="btn-secondary text-xs">Refresh</button>
                                        <button onClick={() => onDeleteQuickFilter(filter.id)} className="btn-secondary text-xs text-rose-600">Delete</button>
                                    </div>
                                </div>
                            ))}
                            <div className="p-3 border border-dashed border-slate-300 rounded-lg space-y-2">
                                <input
                                    className="input-field text-sm"
                                    value={newFilterName}
                                    onChange={(e) => setNewFilterName(e.target.value)}
                                    placeholder="Filter name"
                                />
                                <textarea
                                    className="input-field text-sm"
                                    rows={4}
                                    value={newFilterJson}
                                    onChange={(e) => setNewFilterJson(e.target.value)}
                                    placeholder='{"priorities":["High"],"types":["Bug"]}'
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            try {
                                                const parsed = JSON.parse(newFilterJson || '{}');
                                                onCreateQuickFilter({ name: newFilterName, filter_json: parsed });
                                                setNewFilterName('');
                                                setNewFilterJson('{}');
                                            } catch {
                                                // no-op
                                            }
                                        }}
                                        className="btn-primary text-xs"
                                    >
                                        Add Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transitions' && (
                        <div className="space-y-3">
                            {transitionsDraft.map((rule, index) => (
                                <div key={`${rule.from_status}-${rule.to_status}-${index}`} className="p-3 border border-slate-200 rounded-lg grid grid-cols-12 gap-2">
                                    <input className="col-span-2 input-field text-sm" value={rule.from_status} onChange={(e) => {
                                        const next = [...transitionsDraft]; next[index].from_status = e.target.value; setTransitionsDraft(next);
                                    }} />
                                    <input className="col-span-2 input-field text-sm" value={rule.to_status} onChange={(e) => {
                                        const next = [...transitionsDraft]; next[index].to_status = e.target.value; setTransitionsDraft(next);
                                    }} />
                                    <input className="col-span-4 input-field text-sm" value={(rule.allowed_roles || []).join(',')} onChange={(e) => {
                                        const next = [...transitionsDraft]; next[index].allowed_roles = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); setTransitionsDraft(next);
                                    }} placeholder="Admin,Team Lead,Member" />
                                    <input className="col-span-3 input-field text-sm" value={(rule.required_fields || []).join(',')} onChange={(e) => {
                                        const next = [...transitionsDraft]; next[index].required_fields = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); setTransitionsDraft(next);
                                    }} placeholder="assignee_id,story_points" />
                                    <button className="col-span-1 text-xs text-rose-600" onClick={() => setTransitionsDraft(transitionsDraft.filter((_, i) => i !== index))}>Del</button>
                                </div>
                            ))}
                            <button
                                className="btn-secondary text-xs"
                                onClick={() => setTransitionsDraft([...transitionsDraft, { from_status: 'To Do', to_status: 'In Progress', allowed_roles: ['Admin', 'Team Lead', 'Member'], required_fields: [] }])}
                            >
                                Add Rule
                            </button>
                            <div className="flex justify-end">
                                <button onClick={() => onSaveTransitions(transitionsDraft)} className="btn-primary">Save Transitions</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BoardSettingsModal;
