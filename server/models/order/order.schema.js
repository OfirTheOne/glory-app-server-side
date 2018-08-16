const { mongoose } = require('../../db/mongoose');
const validator = require('validator');

const StripeMethod = 'Stripe';
const PaypalMethod = 'Paypal'
const PaymentMethod = StripeMethod | PaypalMethod;


const OrderSchema = new mongoose.Schema({
    user: {
        userId: {
            type: mongoose.Schema.Types.ObjectId
        },
        email: {
            type: String
        },
        phone: {
            type: String
        }
    },
    orderProducts: {
        type: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true
                },
                pCode : {
                    type: String,
                },
                size: {
                    type: String,
                    required: true,
                    validate: {
                        validator: (VALUE) => validator.isIn(VALUE, ['S', 'M', 'L', 'O']),
                        message: `{VALUE} is not a vaild size.`
                    }
                },
                color: {
                    type: String
                },
                amount: {
                    type: Number,
                    default: 1,
                    validate: {
                        validator: (VALUE) => VALUE > 0,
                        message: `{VALUE} is not a vaild amount.`
                    }
                }
            }
        ]
    },
    total: {
        type: Number
    },
    deliveryAddressDetails: {
        deliveryAddress: {
            type: Object,
        }, 
        deliveryOption: {
            type: String
        },
        deliveryFeed: {
            type: Number
        }
    },
    paid: {
        type: Boolean,
        default: false
    },
    paymentDetails: {
        paymentMethod: {
            type: String
        },
        sourceId: {
            type: String
        }, 
        charge: {
            type: Object
        },
    },
});

module.exports = {
    OrderSchema
}