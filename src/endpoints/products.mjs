import { Router } from "express";
import databaseManager from "../utils/database.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import createMulter, { smartUpload, deleteFromBlob } from "../utils/uploadUtils.mjs";


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
    const products = await (await databaseManager.getKnex())('products')
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

    const products = await (await databaseManager.getKnex())('products').where({ user_id: req.params.userId })
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
    const products = await (await databaseManager.getKnex())('products')
      .where({ "products.user_id": req.user.id })
      .where('products.end_date', '<', new Date())
      .where('products.start_date', '<', new Date())
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


    const products = await (await databaseManager.getKnex())('products').where({ 'products.current_user_id': req.user.id })
      .where('products.end_date', '<', new Date())
      .where('products.start_date', '<', new Date())
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
    const products = await (await databaseManager.getKnex())('products').where({ user_id: req.user.id })
      .where('products.end_date', '<', new Date())
      .where('products.start_date', '<', new Date())
      .whereNot('products.status', 'paid')
      .leftJoin('users', 'products.current_user_id', 'users.id')
      .select('products.*', 'users.name as current_user_name')

    return sendJsonResponse(res, true, 200, "Products fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to list products", { details: err.message });
  }
});

router.get('/getPurchasedProducts', userAuthMiddleware, async (req, res) => {
  try {
    const products = await (await databaseManager.getKnex())('products').where({ current_user_id: req.user.id, 'products.status': 'paid' })

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
    const product = await (await databaseManager.getKnex())('products').where({ id: req.params.productId }).first();
    if (!product) return sendJsonResponse(res, false, 404, "Product not found", []);
    return sendJsonResponse(res, true, 200, "Product fetched successfully", product);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get product", { details: err.message });
  }
});

// Create product
router.post('/createProduct', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

  try {
    const { name, initial_price, description, start_date, end_date } = req.body;


    if (!name || !initial_price || !description || !start_date || !end_date) {
      return sendJsonResponse(res, false, 400, "Missing required fields", []);
    }
    if (!req.files || !req.files['photo']) {
      return sendJsonResponse(res, false, 400, "Image is required", null);
    }

    // Use smartUpload to handle both local and serverless environments
    let filePathForImagePath;
    try {
      filePathForImagePath = await smartUpload(req.files['photo'][0], 'products');
      console.log('📁 File uploaded successfully:', filePathForImagePath);
    } catch (uploadError) {
      console.error('❌ File upload failed:', uploadError);
      return sendJsonResponse(res, false, 500, "File upload failed", { details: uploadError.message });
    }


    const dateStartMySQL = toMySQLDatetime(start_date);
    const dateEndMySQL = toMySQLDatetime(end_date);

    const productData = {
      name,
      photo: filePathForImagePath,
      initial_price,
      current_price: initial_price,
      description,
      status: 'active',
      user_id: req.user.id,
      start_date: dateStartMySQL,
      end_date: dateEndMySQL
    };

    await (await databaseManager.getKnex())('products').insert(productData).returning('*');
    return sendJsonResponse(res, true, 201, "Product created successfully", null);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to create product", { details: err.message });
  }
});

// Update product
router.put('/updateProduct/:productId', userAuthMiddleware, upload.fields([{ name: 'photo' }]), async (req, res) => {

  try {
    const { name, initial_price, description, start_date, end_date } = req.body;

    // Fetch the current ad from the database
    const currentAd = await (await databaseManager.getKnex())('products').where('id', req.params.productId).first();
    if (!currentAd) {
      return sendJsonResponse(res, false, 404, "Ad not found", null);
    }

    const dateStartMySQL = toMySQLDatetime(start_date);
    const dateEndMySQL = toMySQLDatetime(end_date);


    const updateData = {
      name: name !== undefined ? name : currentAd.name,
      photo: currentAd.photo,
      initial_price: initial_price !== undefined ? initial_price : currentAd.initial_price,
      description: description !== undefined ? description : currentAd.description,
      start_date: dateStartMySQL !== undefined ? dateStartMySQL : currentAd.start_date,
      end_date: dateEndMySQL !== undefined ? dateEndMySQL : currentAd.end_date
    };


    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      // Use smart upload function that automatically chooses storage method
      const photoUrl = await smartUpload(req.files['photo'][0], 'cakes');
      console.log('🔍 updateCake - Photo URL determined:', photoUrl);
      updateData.photo = photoUrl;
    }


    // Update the request fund in the database
    const updated = await (await databaseManager.getKnex())('products')
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

    const updated = await (await databaseManager.getKnex())('products')
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
    const deleted = await (await databaseManager.getKnex())('products').where({ id: req.params.productId, user_id: req.user.id }).first();

    // Delete the image from Vercel Blob if it's a Blob URL
    if (deleted.photo) {
      console.log('🔍 deleteCake - Deleting image:', deleted.photo);
      await deleteFromBlob(deleted.photo);
    }

    await (await databaseManager.getKnex())('products').where({ id: req.params.productId, user_id: req.user.id }).del();
    if (!deleted) return sendJsonResponse(res, false, 404, "Product not found", []);

    return sendJsonResponse(res, true, 200, "Product deleted", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to delete product", { details: err.message });
  }
});

export default router; 