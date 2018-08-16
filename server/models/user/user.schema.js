const { mongoose } = require('../../db/mongoose');
const validator = require('validator');

const UserBirthDateSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true,
    },
    month: {
        type: Number,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    }
});

const UserPersonalDataSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        minlength: 1,
    },
    lastName: {
        type: String,
        trim: true,
        minlength: 1,
    },
    gender: {
        type: String,
        minlength: 1,
        validate: (value) => ['male', 'female'].includes(value)
    },
    birthDate: {
        type: UserBirthDateSchema,
    },
});

const UserAddressSchema = new mongoose.Schema({
    country: {
        type: String,
        trim: true,
        minlength: 1,
        required: true,
    },
    address: {
        type: String,
        trim: true,
        minlength: 1,
        required: true,
    },
    city: {
        type: String,
        trim: true,
        minlength: 1,
        required: true,
    },
    postcode: {
        type: Number,
        required: true,
    },
});


const UserSchema = new mongoose.Schema({
    personalData: {
        type: UserPersonalDataSchema,
    },
    address: {
        type: UserAddressSchema,
    },
    authData: {
        email: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            unique: true,
            sparse: true,
            partialFilterExpression: { email: { $exists: true } },
            validate: {
                validator: validator.isEmail,
                message: `{VALUE} is not a vaild email.`
            }
        },
        password: {
            type: String,
            minlength: 6,
        },
        provider: {
            type: String,
            required: true,
            validate: (value) => USER_PROVIDERS.includes(value)
        },
        roll: {
            type: Number,
            default: 1,
            validate: (value) => [1, 2].includes(value)
        },
        tokens: {
            type: [{
                access: {
                    type: String,
                    // required: true,
                },
                expDate: {
                    type: Number,
                    // required: true,
                },
                token: {
                    type: String,
                    // required: true,
                },
                deviceIp: {
                    type: String,
                    // required: true,
                    validate: validator.isIP
                }
            }],
            default: []
        },
    },
    paymentMethods: {
        customerId: String, // stripeJS customer object
        sources: {
            type: [{
                sourceId: String,
                brand: String,
                // exp_year: Number, 
                last4: String,
                metadata: Object,
                isDefault: Boolean
            }],
            default: []
        }
    },
    cartId: {
        type: mongoose.Schema.Types.ObjectId
    },
    wishList: {
        type: [mongoose.Schema.Types.ObjectId]
    },
    orders: {
        type: [
            {
                orderId: mongoose.Schema.Types.ObjectId,
                total: Number
            }
        ],
        default: []
    }

});

const USER_PROVIDERS = ['custom', 'google', 'facebook'];

module.exports = {
    UserSchema,
    USER_PROVIDERS
};