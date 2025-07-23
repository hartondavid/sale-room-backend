import { Router } from "express";
import databaseManager from "../utils/database.mjs";
import bcrypt from "bcrypt";
import { getAuthToken, md5Hash, sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";


const router = Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate request
    if (!email || !password) {
      return sendJsonResponse(res, false, 400, "Email and password are required", []);
    }
    // Fetch user from database
    const user = await (await databaseManager.getKnex())('users').where({ email }).first();

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

    await (await databaseManager.getKnex())('users')
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
    const user = await (await databaseManager.getKnex())('users').where({ id: req.params.userId }).first();
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
    await (await databaseManager.getKnex())('users').where({ id: req.params.userId }).update({ password: hashedPassword });
    return sendJsonResponse(res, true, 200, "Password updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update password", { details: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      right_code,
      confirm_password
    } = req.body;

    if (password.length < 6) {
      return sendJsonResponse(res, false, 400, "Parola trebuie sa aiba minim 6 caractere", null);
    }

    // Fields that are allowed to be added for a new user
    const validFields = [
      'name', 'email', 'password', 'phone', 'confirm_password'
    ];

    // Build the new user data from the request, only including valid fields
    const userData = {};
    for (const key in req.body) {
      if (validFields.includes(key)) {
        userData[key] = key === "password" ? md5Hash(req.body[key]) : userData[key] = key === "confirm_password" ? md5Hash(req.body[key]) : req.body[key];
      }
    }

    // Ensure required fields are present
    if (!userData.name || !userData.email || !userData.password || !userData.phone || !userData.confirm_password) {
      return sendJsonResponse(res, false, 400, "Numele, emailul, parola, numarul de telefon si confirmarea parolei sunt obligatorii!", null);
    }
    if (userData.password !== userData.confirm_password) {
      return sendJsonResponse(res, false, 400, "Parolele nu coincid!", []);
    }

    const phoneRegex = /^07[0-9]{8}$/;
    if (!phoneRegex.test(userData.phone)) {
      return sendJsonResponse(res, false, 400, "Numărul de telefon trebuie să înceapă cu 07 și să aibă 10 cifre.", null);
    }


    if (userData.name.length < 3) {
      return sendJsonResponse(res, false, 400, "Numele trebuie sa aiba minim 3 caractere", null);
    }

    if (userData.email.length < 3) {
      return sendJsonResponse(res, false, 400, "Emailul trebuie sa aiba minim 3 caractere", null);
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(userData.email)) {
      return sendJsonResponse(res, false, 400, "Emailul nu este valid", null);
    }

    if (!right_code) {
      return sendJsonResponse(res, false, 400, "Dreptul este obligatoriu", null);
    }

    console.log('🔍 right_code received:', right_code);
    console.log('🔍 right_code type:', typeof right_code);

    // Convert right_code to number if it's a string
    const numericRightCode = parseInt(right_code, 10);
    console.log('🔍 numericRightCode:', numericRightCode);

    if (isNaN(numericRightCode)) {
      return sendJsonResponse(res, false, 400, "Dreptul trebuie să fie un număr valid", null);
    }

    let newUserId;
    // let rightCode;
    const userEmail = await (await databaseManager.getKnex())('users').where('email', email).first();
    if (!userEmail) {
      // Insert the new user into the database
      const insertResult = await (await databaseManager.getKnex())('users')
        .insert(userData)
        .returning('id');

      console.log('🔍 Insert result:', insertResult);

      // Extract the user ID properly
      let newUserId;
      if (Array.isArray(insertResult) && insertResult.length > 0) {
        newUserId = typeof insertResult[0] === 'object' ? insertResult[0].id : insertResult[0];
      } else if (typeof insertResult === 'object' && insertResult.id) {
        newUserId = insertResult.id;
      } else {
        newUserId = insertResult;
      }

      console.log('🔍 Extracted newUserId:', newUserId);
      console.log('🔍 newUserId type:', typeof newUserId);

      // Ensure newUserId is a number
      if (typeof newUserId === 'string') {
        newUserId = parseInt(newUserId, 10);
      }

      if (typeof newUserId !== 'number' || isNaN(newUserId)) {
        console.error('❌ Invalid newUserId:', newUserId);
        return sendJsonResponse(res, false, 500, "Eroare la crearea utilizatorului - ID invalid", null);
      }

      // Check what rights exist in the database
      const allRights = await (await databaseManager.getKnex())('rights').select('*');
      console.log('🔍 All rights in database:', allRights);

      // Try to get just the ID directly using raw SQL to avoid serialization issues
      const rightCodeResult = await (await databaseManager.getKnex()).raw(
        'SELECT id FROM rights WHERE right_code = ?',
        [numericRightCode]
      );

      console.log('🔍 rightCodeResult raw:', rightCodeResult);
      console.log('🔍 rightCodeResult.rows:', rightCodeResult.rows);

      const rightCode = await (await databaseManager.getKnex())('rights').where('right_code', numericRightCode).first();

      console.log('🔍 rightCode found:', rightCode);
      console.log('🔍 rightCode.id type:', typeof rightCode?.id);
      console.log('🔍 rightCode.id value:', rightCode?.id);
      console.log('🔍 rightCode.id keys (if object):', rightCode?.id ? Object.keys(rightCode.id) : 'N/A');
      console.log('🔍 rightCode full object:', JSON.stringify(rightCode, null, 2));

      if (!rightCode) {
        return sendJsonResponse(res, false, 400, "Dreptul nu a fost găsit", null);
      }

      // Ensure right_id is a number - handle nested object case
      let rightId;

      // Try to use the direct ID query result first
      if (rightCodeResult && rightCodeResult.rows && rightCodeResult.rows.length > 0) {
        rightId = rightCodeResult.rows[0].id;
        console.log('🔍 Using rightId from raw query:', rightId);
      } else if (rightCodeResult && rightCodeResult.id) {
        rightId = rightCodeResult.id;
        console.log('🔍 Using rightId from direct query:', rightId);
      } else if (typeof rightCode.id === 'object' && rightCode.id !== null) {
        // If it's an object, try to extract the id
        rightId = rightCode.id.id || rightCode.id.value || Object.values(rightCode.id)[0];
        console.log('🔍 Extracted rightId from object:', rightId);
      } else {
        rightId = rightCode.id;
      }

      // Force conversion to number and handle any remaining object issues
      if (typeof rightId === 'object' && rightId !== null) {
        console.log('🔍 rightId is still an object, trying to extract value:', rightId);
        rightId = rightId.id || rightId.value || Object.values(rightId)[0];
        console.log('🔍 After second extraction:', rightId);
      }

      // Convert to number if it's a string
      if (typeof rightId === 'string') {
        rightId = parseInt(rightId, 10);
      }

      console.log('🔍 Final right_id value:', rightId);
      console.log('🔍 Final right_id type:', typeof rightId);

      if (typeof rightId !== 'number' || isNaN(rightId)) {
        console.error('❌ Invalid rightId:', rightId);
        return sendJsonResponse(res, false, 400, "ID-ul dreptului nu este valid", null);
      }

      console.log('🔍 About to insert with values:', {
        user_id: newUserId,
        right_id: rightId,
        right_id_type: typeof rightId
      });

      await (await databaseManager.getKnex())('user_rights')
        .insert({
          user_id: newUserId,
          right_id: rightId
        });

      sendJsonResponse(res, true, 201, "Utilizatorul a fost creat cu succes", { id: newUserId });
    } else {
      sendJsonResponse(res, false, 400, "Utilizatorul exista deja", null);
    }


  } catch (error) {
    console.error("Error creating user:", error);
    sendJsonResponse(res, false, 500, "Internal server error", null);
  }
});

router.get('/getUsers', userAuthMiddleware, async (req, res) => {

  try {

    const userId = req.user.id;

    const userRights = await (await databaseManager.getKnex())('user_rights')
      .join('rights', 'user_rights.right_id', 'rights.id')
      .where('rights.right_code', 3)
      .where('user_rights.user_id', userId)
      .first();

    if (!userRights) {
      return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
    }

    const users = await (await databaseManager.getKnex())('users').
      join('user_rights', 'users.id', 'user_rights.user_id')
      .join('rights', 'user_rights.right_id', 'rights.id')
      .whereNot('users.id', userId)
      .select('users.*', 'rights.name as right_name');

    if (!users) {
      return sendJsonResponse(res, false, 404, 'Utilizatorii nu există!', []);
    }
    return sendJsonResponse(res, true, 200, 'Utilizatorii au fost găsiți!', users);
  } catch (error) {
    return sendJsonResponse(res, false, 500, 'Eroare la preluarea utilizatorilor!', { details: error.message });
  }
});

router.delete('/deleteUser/:userId', userAuthMiddleware, async (req, res) => {
  try {

    const { userId } = req.params;

    const loggedUserId = req.user.id;

    const userRights = await (await databaseManager.getKnex())('user_rights')
      .join('rights', 'user_rights.right_id', 'rights.id')
      .where('rights.right_code', 3)
      .where('user_rights.user_id', loggedUserId)
      .first();

    if (!userRights) {
      return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
    }

    const user = await (await databaseManager.getKnex())('users').where({ id: userId }).first();
    if (!user) return sendJsonResponse(res, false, 404, "Utilizatorul nu există!", []);
    await (await databaseManager.getKnex())('users').where({ id: userId }).del();
    return sendJsonResponse(res, true, 200, "Utilizatorul a fost șters cu succes!", []);
  } catch (error) {
    return sendJsonResponse(res, false, 500, "Eroare la ștergerea ingredientului!", { details: error.message });
  }
});

export default router; 