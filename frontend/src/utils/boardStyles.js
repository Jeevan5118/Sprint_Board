import {
    BOARD_FEATURE_FLAGS_DEFAULT,
    BOARD_STATUS_KEY_BY_VALUE,
    DEFAULT_BOARD_COLUMNS,
    DEFAULT_BOARD_SETTINGS,
    DEFAULT_COLOR_RULES
} from '../constants/boardTheme';

const normalizeRuleMap = (rules = []) => {
    const map = { status: {}, type: {}, priority: {} };
    rules.forEach((rule) => {
        if (!rule?.dimension || !rule?.dimension_value) return;
        if (!map[rule.dimension]) map[rule.dimension] = {};
        map[rule.dimension][rule.dimension_value] = rule;
    });
    return map;
};

export const resolveBoardConfig = (apiConfig, boardType = 'kanban') => {
    const normalizedBoardType = boardType === 'sprint' ? 'sprint' : 'kanban';
    const settings = apiConfig?.settings || DEFAULT_BOARD_SETTINGS;
    const columns = Array.isArray(apiConfig?.columns) && apiConfig.columns.length > 0
        ? [...apiConfig.columns].sort((a, b) => a.position - b.position)
        : DEFAULT_BOARD_COLUMNS[normalizedBoardType];
    const color_rules = Array.isArray(apiConfig?.color_rules) && apiConfig.color_rules.length > 0
        ? apiConfig.color_rules
        : DEFAULT_COLOR_RULES;
    const quick_filters = Array.isArray(apiConfig?.quick_filters) ? apiConfig.quick_filters : [];
    const transition_rules = Array.isArray(apiConfig?.transition_rules) ? apiConfig.transition_rules : [];
    const feature_flags = { ...BOARD_FEATURE_FLAGS_DEFAULT, ...(apiConfig?.feature_flags || {}) };

    return {
        settings: { ...DEFAULT_BOARD_SETTINGS, ...settings },
        columns,
        color_rules,
        quick_filters,
        transition_rules,
        feature_flags,
        color_rule_map: normalizeRuleMap(color_rules),
    };
};

export const resolveTaskCardStyle = (task, boardConfig) => {
    const ruleMap = boardConfig?.color_rule_map || normalizeRuleMap(DEFAULT_COLOR_RULES);
    const statusRule = ruleMap.status?.[task?.status] || ruleMap.status?.['To Do'];
    const typeRule = ruleMap.type?.[task?.type] || ruleMap.type?.Task;
    const priorityRule = ruleMap.priority?.[task?.priority] || ruleMap.priority?.Medium;

    return {
        status: statusRule,
        type: typeRule,
        priority: priorityRule,
    };
};

export const getColumnStatus = (column) => {
    if (!column) return 'To Do';
    const key = String(column.column_key || '').toLowerCase();
    if (key && Object.values(BOARD_STATUS_KEY_BY_VALUE).includes(key)) {
        // no-op; fallback below handles direct value
    }
    const fallback = {
        backlog: 'Backlog',
        todo: 'To Do',
        in_progress: 'In Progress',
        review: 'Review',
        done: 'Done',
    };
    return fallback[key] || column.display_name || 'To Do';
};

export const taskMatchesFilter = (task, filter = {}) => {
    if (!task) return false;
    if (Array.isArray(filter.priorities) && filter.priorities.length > 0 && !filter.priorities.includes(task.priority)) {
        return false;
    }
    if (Array.isArray(filter.types) && filter.types.length > 0 && !filter.types.includes(task.type)) {
        return false;
    }
    if (Array.isArray(filter.assignee_ids) && filter.assignee_ids.length > 0) {
        const assigned = new Set([task.assignee_id, ...(task.assignee_ids || [])].filter(Boolean));
        const match = filter.assignee_ids.some((id) => assigned.has(id));
        if (!match) return false;
    }
    if (filter.search && String(filter.search).trim()) {
        const q = String(filter.search).trim().toLowerCase();
        const hay = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
    }
    return true;
};
