const { mongoose } = require('../../db/mongoose');
const validator = require('validator');

const LogSchema = new mongoose.Schema({
    message : {
        type: String,
        default: ''
    },

    source : {
        type: String,
        default: ''
    },

    position : {
        type: String,
        default: ''
    },

    insertionDate: {
        type: Number,
        default: new Date().getTime()
    },

    logLevel: {
        type: String,
        default: 'info',
        validator: (VALUE) => validator.isIn(VALUE, ['info', 'debug', 'error']),
                    message: `logLevel is not a vaild size.`
    }
});

module.exports = {
    LogSchema
}