import { Router } from "express";
import db from "../utils/database.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";

const router = Router();

// Place order
router.post('/createOrder', userAuthMiddleware, async (req, res) => {
  const { country, city, street, house_number, apartment_number, floor, postal_code, phone, items } = req.body;

  if (!country || !city || !street || !house_number || !apartment_number ||
    !floor || !postal_code || !phone || !Array.isArray(items) || items.length === 0) {
    return sendJsonResponse(res, false, 400, "Missing fields or items", []);
  }

  try {
    // Get all product prices
    const productIds = items.map(item => item.product_id);
    const products = await (await db.getKnex())('products').whereIn('id', productIds);

    // Create a map of product prices
    const productPrices = products.reduce((map, product) => {
      map[product.id] = product.current_price;
      return map;
    }, {});

    // Calculate total and validate all products exist
    let total = 0;
    for (const item of items) {
      if (!productPrices[item.product_id]) {
        return sendJsonResponse(res, false, 400, `Product with id ${item.product_id} not found`, []);
      }
      total += productPrices[item.product_id] * item.quantity;
    }

    // Insert order
    const [order_id] = await (await db.getKnex())('orders').insert({
      user_id: req.user.id,
      country,
      city,
      street,
      house_number,
      apartment_number,
      floor,
      postal_code,
      phone,
      total,
      is_paid: false,
      is_delivered: true,
    });

    // Insert order items with prices from database
    for (const item of items) {
      await (await db.getKnex())('order_items').insert({
        order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: productPrices[item.product_id]
      });
    }

    return sendJsonResponse(res, true, 201, "Order placed successfully", { order_id });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to place order", { details: err.message });
  }
});

// Get all orders for the authenticated customer
router.get('/getOrders', userAuthMiddleware, async (req, res) => {
  try {
    const orders = await (await db.getKnex())('orders').where({ user_id: req.user.id });
    if (orders.length === 0) {
      return sendJsonResponse(res, true, 200, "Orders fetched successfully", []);
    }

    // For each payment, get the order and its products
    const results = await Promise.all(orders.map(async order => {
      // Get order items for this order
      const orderItems = await (await db.getKnex())('order_items')
        .where('order_id', order.id)
        .join('products', 'order_items.product_id', 'products.id')
        .where('products.current_user_id', req.user.id)
        .select(
          'products.id',
          'products.name',
          'products.photo',
          'products.description',
          'order_items.quantity',
          'order_items.price'
        );
      return {
        ...order,
        order: {
          id: order.id,
          address: order.address,
          total: order.total,
          is_paid: order.is_paid,
          is_delivered: order.is_delivered,
        },
        products: orderItems
      };
    }));


    return sendJsonResponse(res, true, 200, "Orders fetched successfully", results);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get orders", { details: err.message });
  }
});

// Get order by id (with items)
router.get('/getOrder/:orderId', userAuthMiddleware, async (req, res) => {
  try {
    const order = await (await db.getKnex())('orders').where({ id: req.params.orderId }).first();
    if (!order) return sendJsonResponse(res, false, 404, "Order not found", []);

    const items = await (await db.getKnex())('order_items').where({ order_id: order.id });
    return sendJsonResponse(res, true, 200, "Order fetched successfully", { ...order, items });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get order", { details: err.message });
  }
});

// Update order status
router.put('/updateStatus/:orderId', userAuthMiddleware, async (req, res) => {
  const { is_paid, is_delivered } = req.body;
  try {
    await (await db.getKnex())('orders').where({ id: req.params.orderId }).update({
      is_paid,
      is_delivered
    });
    return sendJsonResponse(res, true, 200, "Order status updated", []);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to update order status", { details: err.message });
  }
});

export default router; 