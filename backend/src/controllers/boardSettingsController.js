import db from '../config/db.js';
import { defaultCardFields, getBoardConfig, getBoardSettingsId } from '../services/boardSettingsService.js';

const getBoardType = (value) => (value === 'sprint' ? 'sprint' : 'kanban');
const asBool = (value) => value === true || value === 'true';

export const fetchBoardSettings = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type);
        const isPowerHour = asBool(req.query.is_power_hour);
        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config);
    } catch (error) {
        next(error);
    }
};

export const updateBoardSettings = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type || req.body.board_type);
        const isPowerHour = asBool(req.query.is_power_hour || req.body.is_power_hour);
        const settingsId = await getBoardSettingsId(teamId, isPowerHour, boardType);

        const {
            swimlane_mode,
            show_epic_panel,
            show_card_fields,
            done_column_key,
            enable_quick_filters,
            enable_color_customization,
            enable_transition_rules
        } = req.body;

        const payload = {
            swimlane_mode: swimlane_mode || 'none',
            show_epic_panel: !!show_epic_panel,
            show_card_fields: Array.isArray(show_card_fields) ? show_card_fields : defaultCardFields,
            done_column_key: done_column_key || 'done',
            enable_quick_filters: enable_quick_filters !== false,
            enable_color_customization: enable_color_customization !== false,
            enable_transition_rules: !!enable_transition_rules,
        };

        await db.query(
            `UPDATE board_settings
             SET swimlane_mode = $1,
                 show_epic_panel = $2,
                 show_card_fields = $3::jsonb,
                 done_column_key = $4,
                 enable_quick_filters = $5,
                 enable_color_customization = $6,
                 enable_transition_rules = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8`,
            [
                payload.swimlane_mode,
                payload.show_epic_panel,
                JSON.stringify(payload.show_card_fields),
                payload.done_column_key,
                payload.enable_quick_filters,
                payload.enable_color_customization,
                payload.enable_transition_rules,
                settingsId
            ]
        );

        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config);
    } catch (error) {
        next(error);
    }
};

export const updateBoardColumns = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type || req.body.board_type);
        const isPowerHour = asBool(req.query.is_power_hour || req.body.is_power_hour);
        const settingsId = await getBoardSettingsId(teamId, isPowerHour, boardType);
        const { columns } = req.body;

        if (!Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json({ message: 'columns array is required' });
        }

        await db.query('BEGIN');
        await db.query('DELETE FROM board_columns WHERE board_settings_id = $1', [settingsId]);
        for (let i = 0; i < columns.length; i += 1) {
            const col = columns[i];
            await db.query(
                `INSERT INTO board_columns
                 (board_settings_id, column_key, display_name, position, wip_limit, is_done_column)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    settingsId,
                    col.column_key,
                    col.display_name || col.column_key,
                    Number.isFinite(col.position) ? col.position : i,
                    col.wip_limit ?? null,
                    !!col.is_done_column
                ]
            );
        }
        await db.query('COMMIT');

        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config);
    } catch (error) {
        await db.query('ROLLBACK');
        next(error);
    }
};

export const updateBoardColorRules = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type || req.body.board_type);
        const isPowerHour = asBool(req.query.is_power_hour || req.body.is_power_hour);
        const settingsId = await getBoardSettingsId(teamId, isPowerHour, boardType);
        const { color_rules } = req.body;

        if (!Array.isArray(color_rules) || color_rules.length === 0) {
            return res.status(400).json({ message: 'color_rules array is required' });
        }

        await db.query('BEGIN');
        for (const rule of color_rules) {
            await db.query(
                `INSERT INTO board_color_rules
                 (board_settings_id, dimension, dimension_value, bg_color, text_color, border_color, badge_color)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (board_settings_id, dimension, dimension_value)
                 DO UPDATE SET
                    bg_color = EXCLUDED.bg_color,
                    text_color = EXCLUDED.text_color,
                    border_color = EXCLUDED.border_color,
                    badge_color = EXCLUDED.badge_color,
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    settingsId,
                    rule.dimension,
                    rule.dimension_value,
                    rule.bg_color,
                    rule.text_color,
                    rule.border_color,
                    rule.badge_color,
                ]
            );
        }
        await db.query('COMMIT');

        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config);
    } catch (error) {
        await db.query('ROLLBACK');
        next(error);
    }
};

export const getQuickFilters = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type);
        const isPowerHour = asBool(req.query.is_power_hour);
        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config.quick_filters);
    } catch (error) {
        next(error);
    }
};

export const createQuickFilter = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type || req.body.board_type);
        const isPowerHour = asBool(req.query.is_power_hour || req.body.is_power_hour);
        const settingsId = await getBoardSettingsId(teamId, isPowerHour, boardType);
        const { name, filter_json, position, is_default } = req.body;

        if (!name || !name.trim()) return res.status(400).json({ message: 'Filter name is required' });

        const { rows } = await db.query(
            `INSERT INTO board_quick_filters (board_settings_id, name, filter_json, position, is_default)
             VALUES ($1, $2, $3::jsonb, $4, $5)
             RETURNING *`,
            [settingsId, name.trim(), JSON.stringify(filter_json || {}), Number(position || 0), !!is_default]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateQuickFilter = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, filter_json, position, is_default } = req.body;
        const { rows } = await db.query(
            `UPDATE board_quick_filters
             SET name = $1, filter_json = $2::jsonb, position = $3, is_default = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [name, JSON.stringify(filter_json || {}), Number(position || 0), !!is_default, id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Quick filter not found' });
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const deleteQuickFilter = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM board_quick_filters WHERE id = $1', [id]);
        res.json({ message: 'Quick filter deleted' });
    } catch (error) {
        next(error);
    }
};

export const updateTransitionRules = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const boardType = getBoardType(req.query.board_type || req.body.board_type);
        const isPowerHour = asBool(req.query.is_power_hour || req.body.is_power_hour);
        const settingsId = await getBoardSettingsId(teamId, isPowerHour, boardType);
        const { transition_rules } = req.body;

        if (!Array.isArray(transition_rules)) {
            return res.status(400).json({ message: 'transition_rules array is required' });
        }

        await db.query('BEGIN');
        await db.query('DELETE FROM board_transition_rules WHERE board_settings_id = $1', [settingsId]);
        for (const rule of transition_rules) {
            await db.query(
                `INSERT INTO board_transition_rules
                (board_settings_id, from_status, to_status, allowed_roles, required_fields, blocked_if_dependencies_open)
                 VALUES ($1, $2, $3, $4::text[], $5::text[], $6)`,
                [
                    settingsId,
                    rule.from_status,
                    rule.to_status,
                    Array.isArray(rule.allowed_roles) ? rule.allowed_roles : ['Admin', 'Team Lead', 'Member'],
                    Array.isArray(rule.required_fields) ? rule.required_fields : [],
                    !!rule.blocked_if_dependencies_open
                ]
            );
        }
        await db.query('COMMIT');

        const config = await getBoardConfig(teamId, isPowerHour, boardType);
        res.json(config);
    } catch (error) {
        await db.query('ROLLBACK');
        next(error);
    }
};
