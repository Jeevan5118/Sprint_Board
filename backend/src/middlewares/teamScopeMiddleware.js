import db from '../config/db.js';

export const requireTeamMember = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const isPowerHour = req.query.is_power_hour === 'true'
            || req.query.is_power_hour === true
            || req.body?.is_power_hour === 'true'
            || req.body?.is_power_hour === true;

        // Power Hour is workspace-wide: any authenticated user can access it.
        if (isPowerHour) {
            return next();
        }

        if (userRole === 'Admin') {
            return next(); // Admins bypass team scope
        }

        const { rows } = await db.query(
            'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: 'Access denied: not a member of this team' });
        }

        next();
    } catch (error) {
        next(error);
    }
};
