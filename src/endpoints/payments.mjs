import { Router } from "express";
import db from "../utils/database.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";

const router = Router();

// Create payment
router.post('/createPayment', userAuthMiddleware, async (req, res) => {
  const { order_id, payment_method } = req.body;
  if (!order_id || !payment_method) {
    return sendJsonResponse(res, false, 400, "Missing fields", []);
  }

  try {
    const [id] = await db('payments').insert({
      order_id,
      payment_method,
      status: 'completed',
    });


    await db('orders').where('id', order_id).update({
      is_paid: true,
      // is_delivered: true,
    });

    await db('products')
      .join('order_items', 'products.id', 'order_items.product_id')
      .where('order_items.order_id', order_id)
      .update({
        status: 'paid',
      });




    return sendJsonResponse(res, true, 201, "Payment created successfully", { id, order_id, payment_method });
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to create payment", { details: err.message });
  }
});

// Get payments with order and products
router.get('/getPaymentsByCustomerId', userAuthMiddleware, async (req, res) => {
  try {
    // Get all payments for the user's orders
    const payments = await db('payments')
      .join('orders', 'payments.order_id', 'orders.id')
      .select('payments.*', 'orders.id', 'orders.total', 'orders.is_paid', 'orders.is_delivered');


    // For each payment, get the order and its products
    const results = await Promise.all(payments.map(async payment => {
      // Get order items for this order
      const orderItems = await db('order_items')
        .where('order_id', payment.order_id)
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
        ...payment,
        order: {
          id: payment.order_id,
          address: payment.address,
          total: payment.total,
          is_paid: payment.is_paid,
          is_delivered: payment.is_delivered,
          // user_id: payment.user_id
        },
        products: orderItems
      };
    }));


    return sendJsonResponse(res, true, 200, "Payments fetched successfully", results);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get payments", { details: err.message });
  }
});
// Get payments with order and products
router.get('/getPaymentsBySellerId', userAuthMiddleware, async (req, res) => {
  try {
    // Get all payments for the user's orders
    const products = await db('products')
      .where('products.user_id', req.user.id)
      .select('*');


    return sendJsonResponse(res, true, 200, "Payments fetched successfully", products);
  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get payments", { details: err.message });
  }
});

router.get('/getPaymentsByMonth', userAuthMiddleware, async (req, res) => {
  try {

    const products = await db('products')
      .join('users', 'products.user_id', 'users.id')
      .where('products.user_id', req.user.id)
      .select('products.created_at', 'products.current_price');

    const monthNames = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

    const paymentsByMonth = products.reduce((acc, currentItem) => {

      const foundMonth = new Date(currentItem.created_at).getMonth() + 1;

      let month = acc.find(item => item.month === foundMonth);


      if (!month) {

        acc.push(month = {
          month: foundMonth,
          total: 0,
          month_name: monthNames[foundMonth - 1]
        });
      }
      month.total += currentItem.current_price;

      return acc;
    }, []);


    return sendJsonResponse(res, true, 200, "Payments fetched successfully", paymentsByMonth);

  } catch (err) {
    return sendJsonResponse(res, false, 500, "Failed to get payments", { details: err.message });
  }
});



export default router; 