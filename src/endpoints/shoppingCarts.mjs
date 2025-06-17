import { Router } from "express";
import db from "../utils/database.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";

const router = Router();

// Get user cart (with items)
router.get('/getCartItems/:cartId', userAuthMiddleware, async (req, res) => {
  try {
    const cart = await db('shopping_carts').where({ id: req.params.cartId }).first();
    if (!cart) return sendJsonResponse(res, false, 404, "Cart not found", []);

    const items = await db('cart_items')
      .leftJoin('products', 'cart_items.product_id', 'products.id')
      .select('cart_items.*', 'products.*')

      .where({ cart_id: cart.id });


    return sendJsonResponse(res, true, 200, "Cart fetched successfully", { ...cart, items });
  } catch (err) {
    res.status(500).json({ error: "Failed to get cart", details: err.message });
  }
});

// Create new cart
router.post('/createCart', userAuthMiddleware, async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return sendJsonResponse(res, false, 400, "User ID is required", []);
  }

  try {

    // Create new cart
    const [cart_id] = await db('shopping_carts').insert({
      user_id,
    });

    const cart = await db('shopping_carts').where({ id: cart_id }).first();
    return sendJsonResponse(res, true, 201, "Cart created successfully", cart);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to create cart", { details: err.message });
  }
});

// Add product to cart
router.post('/addCartProduct/:cartId', userAuthMiddleware, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return sendJsonResponse(res, false, 400, "Missing fields", []);

  try {

    // Find or create cart
    let cart = await db('shopping_carts').where({ id: req.params.cartId }).first();
    if (!cart) {
      const [cart_id] = await db('shopping_carts').insert({ id: req.params.cartId, total: 0 });
      cart = await db('shopping_carts').where({ id: cart_id }).first();
    }

    // Check if item already in cart
    const existing = await db('cart_items').where({ cart_id: cart.id, product_id }).first();

    if (!existing) {
      // Add new item
      await db('cart_items').insert({ cart_id: cart.id, product_id, quantity: 1 });
    }

    return sendJsonResponse(res, true, 200, "Product added to cart", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to add product to cart", { details: err.message });
  }
});

// Remove product from cart
router.delete('/removeCartProduct/:cartId/:productId', userAuthMiddleware, async (req, res) => {
  try {
    const cart = await db('shopping_carts').where({ id: req.params.cartId }).first();
    if (!cart) return sendJsonResponse(res, false, 404, "Cart not found", []);

    await db('cart_items').where({ cart_id: cart.id, product_id: req.params.productId }).del();
    return sendJsonResponse(res, true, 200, "Product removed from cart", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to remove product from cart", { details: err.message });
  }
});

// Update product quantity in cart
router.put('/updateCartProduct/:cartId/:productId', userAuthMiddleware, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity) return sendJsonResponse(res, false, 400, "Missing fields", []);

  try {
    const cart = await db('shopping_carts').where({ id: req.params.cartId }).first();
    if (!cart) return sendJsonResponse(res, false, 404, "Cart not found", []);

    await db('cart_items').where({ cart_id: cart.id, product_id: req.params.productId }).update({ quantity });
    return sendJsonResponse(res, true, 200, "Cart item quantity updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update cart item", { details: err.message });
  }
});

// Get cart id by user id
router.get('/getCartId/:userId', userAuthMiddleware, async (req, res) => {
  try {
    const cart = await db('shopping_carts').where({ user_id: req.params.userId }).first();
    if (!cart) return sendJsonResponse(res, false, 404, "Cart not found", []);
    return sendJsonResponse(res, true, 200, "Cart ID fetched successfully", { cart_id: cart.id });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get cart id", { details: err.message });
  }
});

// Remove all products from cart
router.delete('/removeAllCartProducts/:cartId', userAuthMiddleware, async (req, res) => {
  try {
    const cart = await db('cart_items').where({ cart_id: req.params.cartId }).del();
    if (!cart) return sendJsonResponse(res, false, 404, "Cart not found", []);

    await db('shopping_carts').where({ id: req.user.id }).del();

    return sendJsonResponse(res, true, 200, "All products removed from cart", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to remove product from cart", { details: err.message });
  }
});



export default router; 