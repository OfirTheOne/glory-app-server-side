const {mongoose} = require('../../db/mongoose');
const {ProductSchema} = require('./product.schema');

const Product = mongoose.model('Product', ProductSchema);

module.exports = {
    Product
}