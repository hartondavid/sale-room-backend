import { Router } from "express";
import db from "../utils/database.mjs";
import bcrypt from "bcrypt";
import { getAuthToken, md5Hash, sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";


const router = Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return sendJsonResponse(res, false, 400, "Missing fields", []);

  try {
    const existing = await db('users').where({ email }).first();
    if (existing) return sendJsonResponse(res, false, 409, "Email already registered", []);

    const hashedPassword = await bcrypt.hash(password, 10);
    const [id] = await db('users').insert({ name, email, password: hashedPassword });
    return sendJsonResponse(res, true, 201, "User registered successfully", { id, name, email });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Registration failed", { details: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate request
    if (!email || !password) {
      return sendJsonResponse(res, false, 400, "Email and password are required", []);
    }
    // Fetch user from database
    const user = await db('users').where({ email }).first();

    if (!user) {
      return sendJsonResponse(res, false, 401, "Invalid credentials", []);
    }

    // Compare passwords (hashed with MD5)
    const hashedPassword = md5Hash(password);

    if (hashedPassword !== user.password) {
      return sendJsonResponse(res, false, 401, "Invalid credentials", []);
    }

    // Generate JWT token
    const token = getAuthToken(user.id, user.email, false, '1d', true)

    await db('users')
      .where({ id: user.id })
      .update({ last_login: parseInt(Date.now() / 1000) });

    // Set custom header
    res.set('X-Auth-Token', token);

    return sendJsonResponse(res, true, 200, "Successfully logged in!", { user });
  } catch (error) {
    console.error("Login error:", error);
    return sendJsonResponse(res, false, 500, "Internal server error", []);
  }
});


router.get('/checkLogin', userAuthMiddleware, async (req, res) => {
  return sendJsonResponse(res, true, 200, "User is logged in", req.user);
})

// Get customer profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return sendJsonResponse(res, false, 404, "User not found", []);

    return sendJsonResponse(res, true, 200, "User fetched successfully", { id: user.id, name: user.name, email: user.email, created_at: user.created_at });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get user", { details: err.message });
  }
});

// Update password
router.put('updatePassword/:userId', async (req, res) => {
  const { password } = req.body;
  if (!password) return sendJsonResponse(res, false, 400, "Missing password", []);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db('users').where({ id: req.params.userId }).update({ password: hashedPassword });
    return sendJsonResponse(res, true, 200, "Password updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update password", { details: err.message });
  }
});

export default router; 