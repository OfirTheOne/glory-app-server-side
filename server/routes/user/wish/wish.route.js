
const wishRoute = require('express').Router();
const { ObjectID } = require('mongodb');


// mongoose models
const { Product } = require('../../../models/product/product.model');

// middleware
const { authenticate } = require('../../../middleware/authenticate');

wishRoute.post('/', authenticate, async (req, res) => {
    const { pid } = req.body;
    const user = req.user;
    if (!ObjectID.isValid(pid)) {
        return res.status(400).send();
    }
    // first time adding an item to wishList user.wishList will be undefined
    if (user.wishList === undefined) {
        user.wishList = [];
    }
    user.wishList.push(pid);
    try {
        await user.save();
        res.send();
    } catch (e) {
        res.status(400).send();
    }
});

wishRoute.get('/', authenticate, (req, res) => {
    const user = req.user;

    // first time adding an item to wishList user.wishList will be undefined
    if (user.wishList === undefined) {
        return res.send({ data: { wishList: [] } });
    }

    try {
        res.send({ data: { wishList: user.wishList } });
    } catch (e) {
        res.status(400).send();
    }
});


wishRoute.get('/products', authenticate, async (req, res) => {
    const user = req.user;

    // first time adding an item to wishList user.wishList will be undefined
    if (user.wishList === undefined || user.wishList.length === 0) {
        return res.send({ data: [] });
    }
    console.log(user.wishList);
    const { wishList } = user;
    const products = await Product.find({ _id: { $in: wishList } });

    if(!products) {
        return res.status(404).send();
    }

    try {
        res.send({ data: products });
    } catch (e) {
        res.status(400).send();
    }
});

wishRoute.delete('/:pid', authenticate, async (req, res) => {
    const { pid } = req.params;
    const user = req.user;

    if (!ObjectID.isValid(pid)) {
        return res.status(400).send();
    }
    try {

        // first time adding an item to wishList user.wishList will be undefined
        if (user.wishList === undefined) {
            throw new Error();  // case 1 that pid not in wishList, throw Error;
        }
        let beforLen = user.wishList.length;
        user.wishList = user.wishList.filter((productId) => `${productId}` !== `${pid}`);
        if (beforLen === user.wishList.length) {
            throw new Error(); // case 2 that pid not in wishList, throw Error;            
        }
        await user.save();
        res.send();
    } catch (e) {
        res.status(400).send();
    }
});

module.exports = {
    wishRoute
}