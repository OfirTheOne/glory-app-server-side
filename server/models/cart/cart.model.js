const { mongoose } = require('../../db/mongoose');
const { CartSchema } = require('./cart.schema');
const { ObjectID } = require('mongodb');


CartSchema.methods.findProductIndex = function (pid, size) {
    const cart = this;

    const cartContant = cart.contant;
    const indexProduct = cartContant.findIndex((productData) => {
        return `${productData.productId.valueOf()}` === pid && productData.size === size;
    });
    return indexProduct;
}

CartSchema.methods.removeProductAndUpdate = async function (pid, size) {
    const cart = this;

    const productIndex = cart.findProductIndex(pid, size);
    if (productIndex === -1) {
        throw new Error('product not exists in the cart.');
    }

    let cartProduct = cart.contant[productIndex];
    if (cartProduct.amount > 1) {
        cartProduct.amount--;
    } else {
        cart.contant.splice(productIndex, 1);
    }
    try {
        await cart.save()
    } catch (e) {
        throw e;
    }

    /*
    // mongo operations
    const productIndex = cart.findProductIndex(pid, size);
    if (productIndex === -1) {
        throw new Error('product not exists in the cart.');
    }
    let cartProduct = cart.contant[productIndex];
    if (cartProduct.amount > 1) {
        try {
            await cart.update({
                $pull: {
                    contant: {
                        $elemMatch: {
                            productId: { $in: orderdProductsIds },
                            amount: 1
                        }
                    }
                }
            }, { new: true });

        } catch (error) {

        }

    } else {
        // or
        try {
            await cart.update({
                $inc: { "contant.$[element].amount": -1 }
            }, {
                    arrayFilters: [{ 'element.productId': productsId }],
                    new: true
                }
            );
            console.log('updated cart: ', cart);
        } catch (error) {

        }

    }
       
    
    */
}


CartSchema.methods.addProductAndUpdate = async function (pid, size) {

    const cart = this;
    const productIndex = cart.findProductIndex(pid, size);
    // add a new product to the cart / amount is 1
    if (productIndex === -1) {
        let cartItem = {
            productId: new ObjectID(pid),
            size: size,
            insertionDate: new Date().getTime(),
            amount: 1
        };

        cart.contant.push(cartItem);
    } else { // increment the amount of an existing product in the cart
        let cartProduct = cart.contant[productIndex];
        cartProduct.amount++;
    }

    try {
        let res = await cart.save();
        console.log(res);
    } catch (e) {
        throw e;
    }
}

CartSchema.methods.emptyCart = async function () {
    console.log('cart.emptyCart()');
    const cart = this;
    try {
        const updatedCart = await cart.update(
            { $set: { contant: [] } },
            { new: true }
        );
        console.log(updatedCart);
        return updatedCart;

    } catch (error) {
        console.log(error);
        throw error;
    }
}



const Cart = mongoose.model('Cart', CartSchema);




module.exports = {
    Cart
}