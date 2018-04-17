const { mongoose } = require('../../db/mongoose');
const validator = require('validator');

const CartSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId
    },
    contant: {
        type: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            insertionDate: {
                type: Number,
                default: new Date().getTime()
            },
            size: {
                type: String,
                required: true,
                validate: {
                    validator: (VALUE) => validator.isIn(VALUE, ['S', 'M', 'L', 'O']),
                    message: `{VALUE} is not a vaild size.`
                }
            },
            amount: {
                type: Number,
                default: 1,
                validate: {
                    validator: (VALUE) =>VALUE > 0,
                    message: `{VALUE} is not a vaild amount.`
                }
            }
        }],
        default: []
    }
});

module.exports = {
    CartSchema
}