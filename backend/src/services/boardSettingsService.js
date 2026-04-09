import db from '../config/db.js';

const asBool = (value) => value === true || value === 'true';

const readFlag = (name, fallback = true) => {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    return !['false', '0', 'no', 'off'].includes(String(raw).toLowerCase());
};

export const getBoardFeatureFlags = () => ({
    boardSettingsEnabled: readFlag('BOARD_SETTINGS_ENABLED', true),
    boardColorRulesEnabled: readFlag('BOARD_COLOR_RULES_ENABLED', true),
    boardQuickFiltersEnabled: readFlag('BOARD_QUICK_FILTERS_ENABLED', true),
    boardTransitionRulesEnabled: readFlag('BOARD_TRANSITION_RULES_ENABLED', true),
    boardSwimlanesEnabled: readFlag('BOARD_SWIMLANES_ENABLED', true),
});

const DEFAULT_CARD_FIELDS = ['assignee', 'story_points', 'due_date', 'project', 'type', 'priority'];

const STATUS_VALUE_BY_KEY = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
};

const DEFAULT_COLUMNS_BY_BOARD = {
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

const DEFAULT_COLOR_RULES = [
    // Status
    { dimension: 'status', dimension_value: 'Backlog', bg_color: '#F1F5F9', text_color: '#475569', border_color: '#CBD5E1', badge_color: '#64748B' },
    { dimension: 'status', dimension_value: 'To Do', bg_color: '#DBEAFE', text_color: '#1D4ED8', border_color: '#93C5FD', badge_color: '#2563EB' },
    { dimension: 'status', dimension_value: 'In Progress', bg_color: '#FEF3C7', text_color: '#B45309', border_color: '#FCD34D', badge_color: '#D97706' },
    { dimension: 'status', dimension_value: 'Review', bg_color: '#EDE9FE', text_color: '#6D28D9', border_color: '#C4B5FD', badge_color: '#7C3AED' },
    { dimension: 'status', dimension_value: 'Done', bg_color: '#D1FAE5', text_color: '#047857', border_color: '#6EE7B7', badge_color: '#059669' },
    // Type
    { dimension: 'type', dimension_value: 'Task', bg_color: '#ECFEFF', text_color: '#0E7490', border_color: '#A5F3FC', badge_color: '#06B6D4' },
    { dimension: 'type', dimension_value: 'Bug', bg_color: '#FFE4E6', text_color: '#BE123C', border_color: '#FDA4AF', badge_color: '#F43F5E' },
    { dimension: 'type', dimension_value: 'Feature', bg_color: '#CCFBF1', text_color: '#0F766E', border_color: '#5EEAD4', badge_color: '#14B8A6' },
    { dimension: 'type', dimension_value: 'Story', bg_color: '#E0E7FF', text_color: '#3730A3', border_color: '#A5B4FC', badge_color: '#6366F1' },
    // Priority
    { dimension: 'priority', dimension_value: 'Low', bg_color: '#F8FAFC', text_color: '#334155', border_color: '#CBD5E1', badge_color: '#64748B' },
    { dimension: 'priority', dimension_value: 'Medium', bg_color: '#EFF6FF', text_color: '#1D4ED8', border_color: '#BFDBFE', badge_color: '#2563EB' },
    { dimension: 'priority', dimension_value: 'High', bg_color: '#FFF7ED', text_color: '#C2410C', border_color: '#FDBA74', badge_color: '#EA580C' },
    { dimension: 'priority', dimension_value: 'Urgent', bg_color: '#FEF2F2', text_color: '#B91C1C', border_color: '#FCA5A5', badge_color: '#DC2626' },
];

export const getStatusValueFromColumnKey = (columnKey) => STATUS_VALUE_BY_KEY[columnKey] || columnKey;

const ensureBoardDefaults = async (teamId, isPowerHour, boardType) => {
    const type = boardType === 'sprint' ? 'sprint' : 'kanban';
    const boolPowerHour = asBool(isPowerHour);

    const upsertSettings = await db.query(
        `INSERT INTO board_settings (team_id, is_power_hour, board_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (team_id, is_power_hour, board_type)
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [teamId, boolPowerHour, type]
    );
    const settings = upsertSettings.rows[0];

    const existingColumns = await db.query(
        'SELECT id FROM board_columns WHERE board_settings_id = $1 LIMIT 1',
        [settings.id]
    );
    if (existingColumns.rows.length === 0) {
        for (const col of DEFAULT_COLUMNS_BY_BOARD[type]) {
            await db.query(
                `INSERT INTO board_columns (board_settings_id, column_key, display_name, position, wip_limit, is_done_column)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [settings.id, col.column_key, col.display_name, col.position, col.wip_limit, col.is_done_column]
            );
        }
    }

    const existingColors = await db.query(
        'SELECT id FROM board_color_rules WHERE board_settings_id = $1 LIMIT 1',
        [settings.id]
    );
    if (existingColors.rows.length === 0) {
        for (const rule of DEFAULT_COLOR_RULES) {
            await db.query(
                `INSERT INTO board_color_rules
                 (board_settings_id, dimension, dimension_value, bg_color, text_color, border_color, badge_color)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [settings.id, rule.dimension, rule.dimension_value, rule.bg_color, rule.text_color, rule.border_color, rule.badge_color]
            );
        }
    }

    return settings;
};

export const getBoardConfig = async (teamId, isPowerHour, boardType) => {
    const flags = getBoardFeatureFlags();
    const type = boardType === 'sprint' ? 'sprint' : 'kanban';
    const boolPowerHour = asBool(isPowerHour);

    let settings = null;
    if (flags.boardSettingsEnabled) {
        settings = await ensureBoardDefaults(teamId, boolPowerHour, type);
    }

    if (!settings) {
        return {
            settings: {
                id: null,
                team_id: teamId,
                is_power_hour: boolPowerHour,
                board_type: type,
                swimlane_mode: 'none',
                show_epic_panel: false,
                show_card_fields: DEFAULT_CARD_FIELDS,
                done_column_key: 'done',
                enable_quick_filters: true,
                enable_color_customization: true,
                enable_transition_rules: false,
            },
            columns: DEFAULT_COLUMNS_BY_BOARD[type],
            color_rules: DEFAULT_COLOR_RULES,
            quick_filters: [],
            transition_rules: [],
            feature_flags: flags,
        };
    }

    const [columnsRes, colorsRes, filtersRes, transitionsRes] = await Promise.all([
        db.query(
            'SELECT * FROM board_columns WHERE board_settings_id = $1 ORDER BY position ASC',
            [settings.id]
        ),
        db.query(
            'SELECT * FROM board_color_rules WHERE board_settings_id = $1 ORDER BY dimension ASC, dimension_value ASC',
            [settings.id]
        ),
        db.query(
            'SELECT * FROM board_quick_filters WHERE board_settings_id = $1 ORDER BY position ASC, created_at ASC',
            [settings.id]
        ),
        db.query(
            'SELECT * FROM board_transition_rules WHERE board_settings_id = $1 ORDER BY from_status ASC, to_status ASC',
            [settings.id]
        ),
    ]);

    return {
        settings,
        columns: columnsRes.rows,
        color_rules: colorsRes.rows,
        quick_filters: filtersRes.rows,
        transition_rules: transitionsRes.rows,
        feature_flags: flags,
    };
};

export const getBoardSettingsId = async (teamId, isPowerHour, boardType) => {
    const config = await getBoardConfig(teamId, isPowerHour, boardType);
    return config.settings?.id || null;
};

export const defaultCardFields = DEFAULT_CARD_FIELDS;
