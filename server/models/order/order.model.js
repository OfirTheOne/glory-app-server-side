const { mongoose } = require('../../db/mongoose');
const { OrderSchema } = require('./order.schema');
const { Product } = require('../product/product.model');
// const { ObjectID } = require('mongodb');


OrderSchema.statics.calcOrderTotal = async function (orderProducts, deliveryFeed) {
    const Order = this;
    let totalProducts = 0;
    try {   
        for(let i = 0; i < orderProducts.length; i++ )  {
            const product = orderProducts[i];
            const { price } = await Product.findById(product.productId, 'price');
            totalProducts += price * product.amount;
        }
        console.log(totalProducts);
        const total = totalProducts + deliveryFeed;
        return total;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
const Order = mongoose.model('Order', OrderSchema);


module.exports = {
    Order
}