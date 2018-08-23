const orderRoute = require('express').Router();
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { Logger, LogStream } = require('../../../utils/logger-service/logger.service');
// middleware
const { authenticate } = require('../../../middleware/authenticate');

// mongoose models
const { Order, Cart } = require('../../../models/index');

const { ValidationService } = require('../../../utils/custom-validation-service/validation.service')

// StripeJs
const stripe = require("stripe")("sk_test_a0WbK4VPDDW0OLPc8FJROwjd");

// set logger service object
const logger = new Logger(LogStream.CONSOLE);

const DEFAULT_CURRENCY = "usd";


/**** db-managment routes *****/

orderRoute.get('/', async (req, res) => {
    try {
        const orders = await Order.find({});
        logger.info(`GET: /orders`, `Exit`, { params: orders });
        return res.send({ data: orders });

    } catch (error) {
        console.log(error);
        logger.error(`GET: /orders`, `Exit - Failed to get all orders`, { params: { error } });
        return res.status(401).send(`Failed to get all orders`);

    }
});

orderRoute.get('/:uid', async (req, res) => {
    logger.info(`GET: /orders`, `Enter`);

    try {
        const userId = req.params.id;
        if (!ObjectId.isValid(userId)) {
            return res.status(401).send(`user id not valid.`);
        }

        const userOrders = await Order.find({ 'user.userId': userId });
        logger.info(`GET: /orders/:uid`, `Exit`);
        return res.send({ data: userOrders });

    } catch (error) {
        console.log(error);
        logger.error(`GET: /orders/:uid`, `Exit - Failed to get all orders`, { params: { error } });
        return res.status(401).send(`Failed to get all orders`);

    }
});



/**** app routes *****/

orderRoute.post('/', authenticate, async (req, res) => {

    /******* - EXTRACT PARAMETERS STEP - *******/
    const { user } = req;
    const { orderProducts, deliveryAddress, deliveryOption, sourceId, metadata } = req.body;

    // TODO : validate orderProducts, address, deliveryOption & validate that all product are in stock
    if (!validation_orderPost_reqBody(orderProducts, deliveryAddress, deliveryOption, sourceId, metadata)) {
        console.log('request body validation failed.');
        return res.status(401).send('request body validation failed.');
    }

    const deliveryFeed = (deliveryOption == 'standard') ? 5 : 10;
    const deliveryAddressDetails = { deliveryAddress, deliveryOption, deliveryFeed };
    /**
     * validate that the calculation of total charge on the server same as client side calculation.
     */
    const totalCharge = await Order.calcOrderTotal(orderProducts, deliveryFeed);
    if (totalCharge != metadata.total) {
        console.log('server calculation of total charge dif from client side calculation.');
        return res.status(401).send('server calculation of total charge dif from client side calculation.');
    }

    // retrive the stripe-customer object corresponds to the user
    let customer;
    try {
        const { customerId } = user.paymentMethods;
        customer = await stripe.customers.retrieve(customerId);
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    const sourceForCharge = getSourceForCharge(customer, sourceId);
    if (!sourceForCharge) {
        console.log('sourceForCharge not defined.');
        return res.status(401).send('sourceForCharge not defined.');
    }

    /**
     * create the charge of this order.
     */
    let charge;
    try {
        const chargeMetadata = {
            userEmail: user.authData.email, 
            ...deliveryAddress, 
            deliveryOption
        };
        charge = await createCharge(customer.id, sourceForCharge, totalCharge, undefined, chargeMetadata)
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    /**
     *  create an order instance with all the charge data.
     *  remove from the user's cart the purchesed products.
     */
    let order;
    try {
        order = await Order({
            user: { userId: user._id, email: user.authData.email },
            orderProducts, deliveryAddressDetails,
            total: totalCharge, paid: true,
            paymentDetails: {
                paymentMethod: 'credit-card',
                sourceId: sourceForCharge,
                charge
            }
        });
        console.log(order);
        await order.save();
        await user.emptyCart();
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    /**
     * push the new orderId to the user orders array.
     */
    try {
        user.orders.push({
            orderId: order._id,
            total: totalCharge
        });
        await user.save();
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    try {
        return res.send({ data: { user, order, authValue: req.authValue } });
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }
});


function validation_orderPost_reqBody(orderProducts, deliveryAddress, deliveryOption, sourceId, metadata) {
    return true;
}

function getSourceForCharge(customerObject, clientSideSourceId) {
    let sourceForCharge;
    if (!clientSideSourceId) {
        sourceForCharge = customerObject.default_source;
    } else {
        sourceForCharge =
            customerObject.sources.data.some(source => source.id == clientSideSourceId) ?
                clientSideSourceId :
                undefined;
    }
    return sourceForCharge;
}

async function createCharge(customerId, sourceId, amount, currency = DEFAULT_CURRENCY, metadata) {
    const charge = await stripe.charges.create({
        amount,
        currency,
        source: sourceId,
        customer: customerId,
        metadata
        // description: `Charge for ${user.authData.email}.`
    });
    return charge;
}


module.exports = {
    orderRoute
}