const { mongoose } = require('../../db/mongoose');
const { LogSchema } = require('./log.schema');

const Log = mongoose.model('Log', LogSchema);

module.exports = {
    Log
}