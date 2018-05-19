const cartRoute = require('express').Router();
const { ObjectID } = require('mongodb');
const _ = require('lodash');

// mongoose models
const { Cart } = require('../../../models/cart/cart.model');
const { Product } = require('../../../models/product/product.model');

// middleware
const { authenticate } = require('../../../middleware/authenticate');


/********* routes *********/

/** POST: /users/cart
 * Route for adding item to a user cart
 * */
cartRoute.post('/', authenticate, async (req, res) => {

    // --1-- validate the body  
    if (!validateAddCartItemRequest(req)) {
        return res.status(400).send();
    }

    // --2-- build the new item
    const uid = req.user._id; // the authenticated user is the owner of the cart

    // fetching from the req body the added product id and the product size
    const { pid } = req.body;
    const { size } = req.body;

    // --3-- exec the query & handle res        
    try {
        let cart = await Cart.findOne({ ownerId: new ObjectID(uid) });

        // if doc not exists send 400
        if (!cart) {
            return res.status(404).send();
        }

        await cart.addProductAndUpdate(pid, size);

        // success       
        res.send();
    } catch (e) {
        // error fetching the doc - send 400        
        res.status(400).send();
    }
});

/** GET: /users/cart
 * Route for getting the all cart 
 * */
cartRoute.get('/', authenticate, async (req, res) => {
    const uid = req.user._id;

    try {
        const cart = await Cart.findOne({ ownerId: uid });
        if (!cart) {
            return res.status(404).send();
        }
        res.send({ data: cart });
    } catch (e) {
        return res.status(400).send();
    }
});

// GET: /users/cart/products
cartRoute.get('/products', authenticate, async (req, res) => {
    const uid = req.user._id;

    try {
        const cart = await Cart.findOne({ ownerId: uid });
        if (!cart) {
            return res.status(404).send();
        }

        // if the cart is empty send an empty array
        if (cart.contant.length === 0) {
            return res.send({ data: [] });
        }


        // format the cart.contant to duplicate free array of the products id

        let cartProductsId = cart.contant.map((element) => element.productId);
        cartProductsId = _.uniq(cartProductsId);

        // fetch the products
        const products = await Product.find({ _id: { $in: cartProductsId } });

        if (!products) {
            return res.status(404).send();
        }

        // format the cart.contant to the same array only with the product object     
        const cartContant = _.map(cart.contant, (productData) => {
            const product = _.find(products, (value) => {
                return value._id.toString() === `${productData.productId}`
            })
            return {
                product,
                insertionDate: productData.insertionDate,
                size: productData.size,
                amount: productData.amount
            };
        });
        console.log(cartContant);

        res.send({ data: cartContant });
    } catch (e) {
        return res.status(400).send();
    }
});

/** DELETE: /users/cart/q
 * Route for deleting item by his id from user cart
 * */
cartRoute.delete('/:q', authenticate, async (req, res) => {
    const uid = req.user._id;
    const delParams = req.query;
    const { pid } = delParams;
    const { size } = delParams;

    if (!valideteDeleteProductRequest(req)) {
        return res.status(400).send('invalid params');
    }

    try {
        const cart = await Cart.findOne({ ownerId: uid });
        if (!cart) {
            return res.status(404).send();
        }

        await cart.removeProductAndUpdate(pid, size);

        res.send();
    } catch (e) {
        res.status(400).send(e);
    }


});




// /**
//  * Route for empting the user cart
//  * */
// // DELETE: /users/cart/all
// cartRoute.delete('/all', authenticate, async (req, res) => {
//     const uid = req.user._id;
//     try {
//         const cart = await Cart.findOneAndUpdate(
//             { ownerId: uid },
//             { $set: { contant: [] } },
//             { new: true }
//         )
//         if (!cart) {
//             res.status(404).send();
//         }
//         res.send();
//     } catch (e) {
//         res.status(400).send();
//     }

// });

module.exports = {
    cartRoute
}


/********* validators *********/

// validate POST: /users/cart request
/** @description .
 *      #### Validetor for the request POST: /users/cart
 *      The accepted request body params are pid and size.
 *      * view [must param], valide ObjectID.
 *      * size [must param], one of the strings 'S', 'M', 'L', 'O', 
 * @param {Object} req income request
 */
const validateAddCartItemRequest = (req) => {
    const sizeOptions = ['S', 'M', 'L', 'O'];
    const { pid } = req.body;
    const { size } = req.body;
    if (!ObjectID.isValid(pid) || !sizeOptions.includes(size)) {
        return false;
    }
    return true;

}

// validate DELETE: /user/cart/:q request
/** @description .
 *      #### Validetor for the query DELETE: /user/cart/:q
 *      The accepted query params are pid, size.
 *      * pid [must param], value can one of the follwing : 'newIn', 'onSale', 'all'.
 *      * size [must param], value can one of the follwing : 'S', 'M', 'L', 'O'.
 * @param {Object} req incoming request
 */
const valideteDeleteProductRequest = (req) => {
    const params = req.query;

    try {
        let { pid } = params;
        let { size } = params;


        if (!ObjectID.isValid(pid)) {
            throw new Error();
        }

        if(!['S', 'M', 'L', 'O'].includes(size)) {
            throw new Error();            
        }

    } catch (e) {
        return false;
    }
    return true;
}
