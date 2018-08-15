const orderRoute = require('express').Router();
const _ = require('lodash');
const { ObjectID } = require('mongodb');

const { Logger, LogStream } = require('../../../utils/logger-service/logger.service');
// middleware
const { authenticate } = require('../../../middleware/authenticate');

// mongoose models
const { Order } = require('../../../models/order/order.model');


// set logger service object
const logger = new Logger(LogStream.CONSOLE);


orderRoute.post('/',authenticate, async (req, res) => {
    const { orderProducts, deliveryAddress, deliveryOption ,source, paymentMethod } = req.body;

    // TODO : validate orderProducts, address, deliveryOption
    const { user } = req.body; 

    // TODO : validate that all product are in stock
    const deliveryFeed = deliveryOption == 'standard' ? 5 : 10;
    const deliveryAddressDetails = {
        deliveryAddress, 
        deliveryOption, 
        deliveryFeed
    }
    
    const paymentDetails = {
        source,
        paymentMethod
    }
    const total = await Order.calcOrderTotal(orderProducts, deliveryFeed);
    try {
        const order = await Order({
            user: {
                userId: user._id,
                email: user.authData.email
            },
            orderProducts,
            total,
            deliveryAddressDetails
        });
        console.log(order);
        await order.save();
        return res.send({data: order});
    } catch (error) {
        console.log(error);
        return res.status(401).send(error);
    }

    
});