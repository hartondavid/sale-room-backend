import { Router } from "express";
import users from '../endpoints/users.mjs'
import products from '../endpoints/products.mjs'
import shoppingCarts from '../endpoints/shoppingCarts.mjs'
import orders from '../endpoints/orders.mjs'
import payments from '../endpoints/payments.mjs'
import rights from '../endpoints/rights.mjs'

const router = Router();

router.use('/users/', users)
router.use('/products/', products)
router.use('/carts/', shoppingCarts)
router.use('/orders/', orders)
router.use('/payments/', payments)
router.use('/rights/', rights)


export default router;