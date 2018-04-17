
const routes = require('express').Router();
const {usersRoute} = require('./user/user.route');
const {productsRoute} = require('./product/product.route');

// connecting all sub routes
routes.use('/users', usersRoute);
routes.use('/products', productsRoute);

module.exports = {
    routes
}