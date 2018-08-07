
const productsRoute = require('express').Router();
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { Logger, LogStream } = require('../../utils/logger-service/logger.service');
// middleware
const { authenticate } = require('../../middleware/authenticate');

// mongoose models
const { Product } = require('../../models/product/product.model');


// set logger service object
const logger = new Logger(LogStream.CONSOLE);

// ***** routes for db maganment ***** // add admin authentication

productsRoute.post('/', async (req, res) => {
    /**
    * Route for adding a product
    */
    // POST: /products/
    logger.info(`POST: /products`, `Enter`);

    const productBody = _.pick(req.body.product, [
        'pCode', 
        'price', 
        'category', 
        'description', 
        'season',
        'measurement', 
        'imagePath',
        'onSale',
        'newIn',
    ]);
    // TODO: validate productBody
    let product = new Product(productBody);
    console.log(product);
    try {
        const productDoc = await product.save();
        logger.info(`POST: /products`, `Exit`,  { params: { productDoc } });
        return res.send({data: productDoc});
    } catch (e) {
        return res.status(400).send(e);
    }
});

productsRoute.patch('/:pcode', async (req, res) => {
    /**
    * Route for updating a product by pCode
    */
    // POST: /products/
    logger.info(`PATCH: /products/:pcode`, `Enter`);

    const { pcode } = req.params;

    const productAllowedProperties = _.pick(req.body.product, [
        // 'pCode', 
        'price', 
        'category', 
        'description', 
        'season',
        'measurement', 
        'imagePath',
        'onSale',
        'newIn',
    ]);
    const productUpdatedProperties = _.pickBy(productAllowedProperties, _.identity)
    console.log(productUpdatedProperties);
    // TODO: validate productBody
    try {
        const updatedProduct = await Product.findOneAndUpdate(
            {pCode: pcode}, productUpdatedProperties, {new: true});
        const productDoc = await updatedProduct.save();
        logger.info(`PATCH: /products/:pcode`, `Exit`,  { params: { productDoc } });
        return res.send({data: productDoc});
    } catch (e) {
        return res.status(400).send(e);
    }
});


productsRoute.delete('/:pid', async (req, res) => {
    /**
     * Route for deleting a product by id
     */
    // DELETE: /products/:pid
    logger.info(`DELETE: /products/:pid`, `Enter`);

    const { pid } = req.params;
    if (!ObjectID.isValid(pid)) {
        return res.status(400).send();
    }

    try {
        const product = await Product.findByIdAndRemove(pid);
        if (!product) {
            return res.status(404).send();
        }
        return res.send({data: product});
    } catch (e) {
        return res.status(400).send();
    }

});

productsRoute.get('/', async (req, res) => {
    /**
     * Route getting all products sorted by creation date.   
     */
    // GET: /products/
    logger.info(`GET: /products/`, `Enter`);

    // exec the query & handle res    
    try {
        // fetching the doc
        const products = await Product.find({}).sort({ _id : -1 } );

        // if doc not exists send 400
        if (!products) {
            logger.warn(`GET: /products`, `doc not exists`);
            return res.status(404).send('doc not exists');
        }
        // success - send the doc
        logger.info(`GET: /products`, `Exit`, {params: {products}});
        return res.send({data: products});
    } catch (e) {
        // error fetching the doc - send 400
        logger.error(`GET: /products`, `error fetching the doc`, {params: {error: e}});
        return res.status(400).send('error fetching the doc');
    }
});


/**
 * Route for getting a product by id
 */
// GET: /products/:pid
productsRoute.get('/:pid', async (req, res) => {
    logger.info(`GET: /products/:pid`, `Enter`);

    const { pid } = req.params;

    // validate product id
    if (!ObjectID.isValid(pid)) {
        logger.warn(`GET: /products/:pid`, `product id invalid.`);
        return res.status(400).send();
    }

    try {
        // fetching the doc
        const product = await Product.findById(pid);
        // if doc not exists send 400
        if (!product) {
            logger.warn(`GET: /products/:pid`, `doc not exists`);
            return res.status(404).send();
        }
        // success - send the doc
        return res.send({data: product});
    } catch (e) {
        // error fetching the doc - send 400
        logger.error(`GET: /products/:pid`, `error fetching the doc`, {params: {error: e}});
        return res.status(400).send();
    }
});

/**
 * Route for getting all products by a category
 */
// GET: /products/cat/:category
productsRoute.get('/cat/:category', async (req, res) => {
    logger.info(`GET: /products/cat/:category`, `Enter`);

    const { category } = req.params;

    try {
        // fetching the doc
        const products = await Product.find({
            category
        });
        // if doc not exists send 400
        if (!products) {
            logger.warn(`GET: /products/cat/:category`, `doc not exists`);
            return res.status(404).send();
        }
        // success - send the doc
        logger.info(`GET: /products/cat/:category`, `Exit`, {params: {products}});
        return res.send({data: products});
    } catch (e) {
        // error fetching the doc - send 400
        logger.error(`GET: /products/cat/:category`, `error fetching the doc`, {params: {error: e}});
        return res.status(400).send();
    }
});

/**
 * Route for filter products by view category min max sort   
 */
// GET: /products/filter/:q
productsRoute.get('/filter/:q', async (req, res) => {
    logger.info(`GET: /products/filter/:q`, `Enter`);

    // --1-- validate the query params 
    if(!valideteFilterRequest(req)) {
        logger.warn(`GET: /products/filter/:q`, `invalid query params`);
        return res.status(400).send('invalid query params ');
    }

    let filterParams = req.query;

    // --2-- build the query
    let query = Product;
    let viewBy = filterParams.view;
    let { category } = filterParams;
    let { sort } = filterParams;
    let { min } = filterParams;
    let { max } = filterParams;

    if (viewBy !== 'all') {
        query = query.where(`${viewBy}`).equals(true);
    }

    query = query.find({ category });

    if (min !== undefined) {
        query = query.where('price').gte(min);
    }

    if (max !== undefined) {
        query = query.where('price').lte(max);
    }

    if (sort === 'p-desc') {
        query = query.sort({ price: -1 });

    } else if (sort === 'p-asc') {
        query = query.sort({ price: +1 });
    }


    // --3-- exec the query & handle res    
    try {
        // fetching the doc
        let products = await query.exec();

        // if doc not exists send 400
        if (!products) {
            logger.warn(`GET: /products/filter/:q`, `doc not exists`);
            return res.status(404).send('doc not exists');
        }
        // success - send the doc
        logger.info(`GET: /products/filter/:q`, `Exit`, {params: {products}});
        return res.send({data: products});
    } catch (e) {
        // error fetching the doc - send 400
        logger.error(`GET: /products/filter/:q`, `error fetching the doc`, {params: {error: e}});
        return res.status(400).send('error fetching the doc');
    }
});



// validate GET: /products/filter/:q request
/** @description .
 *      #### Validetor for the query GET /products/filter/:q
 *      The accepted query params are view, category, sort, min, max.
 *      * view [must param], value can one of the follwing : 'newIn', 'onSale', 'all'.
 *      * category [must param].
 *      * sort [must param], value can one of the follwing : 'p-desc', 'p-asc', 'rec'.
 *      * min [?], value must be a positive integer.
 *      * max [?], value must be a positive integer.
 * @param {Object} req incoming request
 */
const valideteFilterRequest = (req) => {
    const params = req.query;

    try {

        valideViewBy(params.view);

        let { category } = params;
        let { sort } = params;
        let { min } = params;
        let { max } = params;

        // params must have both of the properties category and sort
        if (category === undefined || sort === undefined) {
            throw new Error();
        }

        // sort can be one of the strings: 'p-desc' or 'p-asc' or 'rec' .
        if (sort !== 'p-desc' && sort !== 'p-asc' && sort !== 'rec') {
            throw new Error();
        }

        // if min exists must be a positive integer
        if (min) {
            let minValue = parseInt(min);
            if (minValue < 0) {
                throw new Error();
            }
        }

        // if max exists must be a positive integer
        if (max) {
            let maxValue = parseInt(max);
            if (maxValue < 0) {
                throw new Error();
            }
        }

        // if both min and max exists max must be larger then min
        if (max && min) {
            if (parseInt(min) > parseInt(max)) {
                throw new Error();
            }
        }

    } catch (e) {
        return false;
    }
    return true;
}

// inner validation
const valideViewBy = (viewBy) => {
    // view be a property in params 
    // and can be one of the strings: 'isNew' or 'onSale' or 'all' .
    validValues = ['onSale','newIn','all'];
    if (viewBy === undefined || viewBy === null) {
        throw new Error();
    } else if (!validValues.includes(viewBy)) {
        throw new Error();

    }
}

module.exports = {
    productsRoute
}