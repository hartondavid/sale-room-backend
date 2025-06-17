import { Router } from "express";
import db from "../utils/database.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import createMulter from "../utils/uploadUtils.mjs";

const upload = createMulter('public/uploads/products', ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']);

const router = Router();

function toMySQLDatetime(dateString) {
  // Converts ISO string to 'YYYY-MM-DD HH:MM:SS'
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// List all products
router.get('/getAllProducts', userAuthMiddleware, async (req, res) => {
  try {
    const products = await db('products')
      .leftJoin('users', 'products.current_user_id', 'users.id')
      .where('products.status', 'active')
      .select('products.*', 'users.name as current_user_name')

    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getProducts/:userId', userAuthMiddleware, async (req, res) => {
  try {

    const products = await db('products').where({ user_id: req.params.userId })
      .where('products.status', 'active')
      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name');

    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getProductsSold', userAuthMiddleware, async (req, res) => {
  try {
    const products = await db('products')
      .where({ "products.user_id": req.user.id })
      .where('products.date_end', '<', new Date())
      .where('products.date_start', '<', new Date())
      .where('products.status', 'paid')
      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name');
    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getOffers', userAuthMiddleware, async (req, res) => {
  try {


    const products = await db('products').where({ 'products.current_user_id': req.user.id })
      .where('products.date_end', '<', new Date())
      .where('products.date_start', '<', new Date())
      .where('products.status', 'active')

      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name');


    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getFinishedOffers', userAuthMiddleware, async (req, res) => {
  try {
    const products = await db('products').where({ user_id: req.user.id })
      .where('products.date_end', '<', new Date())
      .where('products.date_start', '<', new Date())
      .whereNot('products.status', 'paid')
      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name')


    console.log('products', products);
    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getPurchasedProducts', userAuthMiddleware, async (req, res) => {
  try {
    const products = await db('products').where({ current_user_id: req.user.id, 'products.status': 'paid' })

      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name');

    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});


// Get product by id
router.get('/getProduct/:productId', userAuthMiddleware, async (req, res) => {
  try {
    const product = await db('products').where({ id: req.params.productId }).first();
    if (!product) return sendJsonResponse(res, false, 404, "Product not found", []);
    return sendJsonResponse(res, true, 200, "Product fetched successfully", product);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get product", { details: err.message });
  }
});

// Create product
router.post('/createProduct', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

  try {
    const { name, initial_price, description, date_start, date_end } = req.body;


    if (!name || !initial_price || !description || !date_start || !date_end) {
      return sendJsonResponse(res, false, 400, "Missing required fields", []);
    }
    if (!req.files || !req.files['photo']) {
      return sendJsonResponse(res, false, 400, "Image is required", null);
    }

    let filePathForImagePath = req.files['photo'][0].path; // Get the full file path
    filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');


    const dateStartMySQL = toMySQLDatetime(date_start);
    const dateEndMySQL = toMySQLDatetime(date_end);

    const productData = {
      name,
      photo: filePathForImagePath,
      initial_price,
      current_price: initial_price,
      description,
      status: 'active',
      user_id: req.user.id,
      date_start: dateStartMySQL,
      date_end: dateEndMySQL
    };

    await db('products').insert(productData).returning('*');
    return sendJsonResponse(res, true, 201, "Product created successfully", null);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to create product", { details: err.message });
  }
});

// Update product
router.put('/updateProduct/:productId', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

  try {
    const { name, initial_price, description, date_start, date_end } = req.body;

    // Fetch the current ad from the database
    const currentAd = await db('products').where('id', req.params.productId).first();
    if (!currentAd) {
      return sendJsonResponse(res, false, 404, "Ad not found", null);
    }

    const dateStartMySQL = toMySQLDatetime(date_start);
    const dateEndMySQL = toMySQLDatetime(date_end);


    const updateData = {
      name: name !== undefined ? name : currentAd.name,
      photo: currentAd.photo,
      initial_price: initial_price !== undefined ? initial_price : currentAd.initial_price,
      description: description !== undefined ? description : currentAd.description,
      date_start: dateStartMySQL !== undefined ? dateStartMySQL : currentAd.date_start,
      date_end: dateEndMySQL !== undefined ? dateEndMySQL : currentAd.date_end
    };


    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      let filePathForImagePath = req.files['photo'][0].path;
      filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');
      updateData.photo = filePathForImagePath;
    }


    // Update the request fund in the database
    const updated = await db('products')
      .where('id', req.params.productId)
      .update(updateData);
    if (!updated) return sendJsonResponse(res, false, 404, "Product not found", []);
    return sendJsonResponse(res, true, 200, "Product updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update product", { details: err.message });
  }
});

// Update product
router.put('/increaseProductPrice/:productId', userAuthMiddleware, async (req, res) => {
  const { new_price } = req.body;

  try {

    const updated = await db('products')
      .where({ id: req.params.productId })
      .update({
        current_price: new_price,
        current_user_id: req.user.id
      });
    if (!updated) return sendJsonResponse(res, false, 404, "Product not found", []);
    return sendJsonResponse(res, true, 200, "Product updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update product", { details: err.message });
  }
});

// Delete product
router.delete('/deleteProduct/:productId', userAuthMiddleware, async (req, res) => {
  try {
    const deleted = await db('products').where({ id: req.params.productId, user_id: req.user.id }).del();
    if (!deleted) return sendJsonResponse(res, false, 404, "Product not found", []);
    return sendJsonResponse(res, true, 200, "Product deleted", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to delete product", { details: err.message });
  }
});

export default router; 