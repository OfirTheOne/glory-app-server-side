const orderRoute = require('express').Router();
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { Logger, LogStream } = require('../../../utils/logger-service/logger.service');
// middleware
const { authenticate } = require('../../../middleware/authenticate');

// mongoose models
const { Order } = require('../../../models/order/order.model');

// StripeJs
const stripe = require("stripe")("sk_test_a0WbK4VPDDW0OLPc8FJROwjd");

// set logger service object
const logger = new Logger(LogStream.CONSOLE);


orderRoute.post('/', authenticate, async (req, res) => {

    /******* - EXTRACT PARAMETERS STEP - *******/
    const { user } = req;
    const {
        orderProducts, deliveryAddress, deliveryOption,
        sourceId, metadata
    } = req.body;



    // TODO : validate orderProducts, address, deliveryOption
    // TODO : validate that all product are in stock
    const deliveryFeed = (deliveryOption == 'standard')? 5 : 10;
    const deliveryAddressDetails = {
        deliveryAddress,
        deliveryOption,
        deliveryFeed
    };
    console.log('deliveryAddressDetails: ', JSON.stringify(deliveryAddressDetails, undefined, 2));

    /**
     * validate that the calculation of total charge on the server same as 
     * client side calculation.
     */
    const totalCharge = await Order.calcOrderTotal(orderProducts, deliveryFeed);
    console.log('totalCharge: ', totalCharge);
    if (totalCharge != metadata.total) {
        console.log('server calculation of total charge dif from client side calculation.');
        return res.status(401).send('server calculation of total charge dif from client side calculation.');
    }

    // retrive the stripe-customer object corresponds to the user
    let customer;
    try {
        const customerId = user.paymentMethods.customerId;
        customer = await stripe.customers.retrieve(customerId);
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }
    console.log('customer: ', JSON.stringify(customer, undefined, 2));
    let sourceForCharge;
    if (!sourceId) {
        sourceForCharge = customer.default_source;
    } else {
        sourceForCharge = 
            customer.sources.data.some(source => source.id == sourceId) ? 
                sourceId : 
                undefined;
    }
    console.log('sourceForCharge: ', sourceForCharge);


    /**
     * create the charge of this order.
     */
    let charge;
    try {
        charge = await stripe.charges.create({
            amount: totalCharge,
            currency: "usd",
            source: sourceForCharge,
            description: `Charge for ${user.authData.email}.`
        });
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    /**
     * create an order instance with all the charge data.
     */
    let order;
    try {
        order = await Order({
            user: {
                userId: user._id,
                email: user.authData.email
            },
            orderProducts,
            total: totalCharge,
            deliveryAddressDetails,
            paid: true,
            paymentDetails: {
                paymentMethod: 'credit-card',
                sourceId: sourceForCharge,
                charge
            }
        });
        console.log(order);
        await order.save();
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
        return res.send({ data: {
            user,
            order,
            authValue: req.authValue
        }});
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    /*
    */
});

module.exports = {
    orderRoute
}