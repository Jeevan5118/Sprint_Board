import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { rows } = await db.query('SELECT id, name, email, role, avatar_url FROM users WHERE id = $1', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ message: 'Session expired, please login again' });
        }
        if (error.name === 'JsonWebTokenError') {
             return res.status(401).json({ message: 'Invalid token, authorization denied' });
        }
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
