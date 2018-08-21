const { Product } = require('./product/product.model');
const { Order } = require('./order/order.model');
const { Cart } = require('./cart/cart.model');
const { User } = require('./user/user.model');
const { Log } = require('./log/log.model');


module.exports = {
    Product,
    Order,
    Cart,
    User,
    Log
}

