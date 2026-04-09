export const BOARD_STATUS_VALUE_BY_KEY = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
};

export const BOARD_STATUS_KEY_BY_VALUE = Object.fromEntries(
    Object.entries(BOARD_STATUS_VALUE_BY_KEY).map(([key, value]) => [value, key])
);

export const DEFAULT_BOARD_COLUMNS = {
    kanban: [
        { column_key: 'backlog', display_name: 'Backlog', position: 0, wip_limit: null, is_done_column: false },
        { column_key: 'todo', display_name: 'To Do', position: 1, wip_limit: null, is_done_column: false },
        { column_key: 'in_progress', display_name: 'In Progress', position: 2, wip_limit: null, is_done_column: false },
        { column_key: 'review', display_name: 'Review', position: 3, wip_limit: null, is_done_column: false },
        { column_key: 'done', display_name: 'Done', position: 4, wip_limit: null, is_done_column: true },
    ],
    sprint: [
        { column_key: 'todo', display_name: 'To Do', position: 0, wip_limit: null, is_done_column: false },
        { column_key: 'in_progress', display_name: 'In Progress', position: 1, wip_limit: null, is_done_column: false },
        { column_key: 'review', display_name: 'Review', position: 2, wip_limit: null, is_done_column: false },
        { column_key: 'done', display_name: 'Done', position: 3, wip_limit: null, is_done_column: true },
    ],
};

export const DEFAULT_COLOR_RULES = [
    { dimension: 'status', dimension_value: 'Backlog', bg_color: '#F1F5F9', text_color: '#475569', border_color: '#CBD5E1', badge_color: '#64748B' },
    { dimension: 'status', dimension_value: 'To Do', bg_color: '#DBEAFE', text_color: '#1D4ED8', border_color: '#93C5FD', badge_color: '#2563EB' },
    { dimension: 'status', dimension_value: 'In Progress', bg_color: '#FEF3C7', text_color: '#B45309', border_color: '#FCD34D', badge_color: '#D97706' },
    { dimension: 'status', dimension_value: 'Review', bg_color: '#EDE9FE', text_color: '#6D28D9', border_color: '#C4B5FD', badge_color: '#7C3AED' },
    { dimension: 'status', dimension_value: 'Done', bg_color: '#D1FAE5', text_color: '#047857', border_color: '#6EE7B7', badge_color: '#059669' },
    { dimension: 'type', dimension_value: 'Task', bg_color: '#ECFEFF', text_color: '#0E7490', border_color: '#A5F3FC', badge_color: '#06B6D4' },
    { dimension: 'type', dimension_value: 'Bug', bg_color: '#FFE4E6', text_color: '#BE123C', border_color: '#FDA4AF', badge_color: '#F43F5E' },
    { dimension: 'type', dimension_value: 'Feature', bg_color: '#CCFBF1', text_color: '#0F766E', border_color: '#5EEAD4', badge_color: '#14B8A6' },
    { dimension: 'type', dimension_value: 'Story', bg_color: '#E0E7FF', text_color: '#3730A3', border_color: '#A5B4FC', badge_color: '#6366F1' },
    { dimension: 'priority', dimension_value: 'Low', bg_color: '#F8FAFC', text_color: '#334155', border_color: '#CBD5E1', badge_color: '#64748B' },
    { dimension: 'priority', dimension_value: 'Medium', bg_color: '#EFF6FF', text_color: '#1D4ED8', border_color: '#BFDBFE', badge_color: '#2563EB' },
    { dimension: 'priority', dimension_value: 'High', bg_color: '#FFF7ED', text_color: '#C2410C', border_color: '#FDBA74', badge_color: '#EA580C' },
    { dimension: 'priority', dimension_value: 'Urgent', bg_color: '#FEF2F2', text_color: '#B91C1C', border_color: '#FCA5A5', badge_color: '#DC2626' },
];

export const DEFAULT_BOARD_SETTINGS = {
    swimlane_mode: 'none',
    show_epic_panel: false,
    show_card_fields: ['assignee', 'story_points', 'due_date', 'project', 'type', 'priority'],
    done_column_key: 'done',
    enable_quick_filters: true,
    enable_color_customization: true,
    enable_transition_rules: false,
};

export const BOARD_FEATURE_FLAGS_DEFAULT = {
    boardSettingsEnabled: true,
    boardColorRulesEnabled: true,
    boardQuickFiltersEnabled: true,
    boardTransitionRulesEnabled: true,
    boardSwimlanesEnabled: true,
};
