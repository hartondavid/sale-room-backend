import jwt from 'jsonwebtoken';
import db from '../database.mjs'; // Adjust the path as necessary


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const userAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Check if JWT_SECRET is properly configured
    if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret') {
        console.error('❌ JWT_SECRET not properly configured! Please set JWT_SECRET environment variable.');
        return res.status(500).json({ error: 'Server configuration error - JWT_SECRET not set' });
    }

    if (!token) {
        return res.status(422).json({ error: 'Missing Auth Token' });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        const userId = decodedToken.id;

        // Fetch the user from the database based on the ID from the token
        const user = await (await db.getKnex())('users').where({ id: userId }).first();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Attach the user to the request object
        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        console.error(err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(422).json({ error: 'Invalid token format' });
        } else if (err.name === 'TokenExpiredError') {
            return res.status(422).json({ error: 'Token expired' });
        } else {
            return res.status(422).json({ error: 'Invalid token' });
        }
    }
};
