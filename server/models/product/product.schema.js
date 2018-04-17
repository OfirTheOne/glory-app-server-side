const { mongoose } = require('../../db/mongoose');

const ProductSchema = new mongoose.Schema({
    pCode: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    measurement: {
        type: [String],
        required: true,
    },
    createDate: {
        type: Number,
        required: false,
        default: new Date().getTime()
    },
    onSale: {
        type: Boolean,
        default: false
    },
    newIn: {
        type: Boolean,
        default: false
    },
    season: {
        type: String,
        required: false,
    },
    brand: {
        type: String,
        required: false,
    },
    imagePath: {
        type: String,
        required: false,
    }
});

module.exports = {
    ProductSchema
};