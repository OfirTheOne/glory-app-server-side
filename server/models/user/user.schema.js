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
        required: true,
        trim: true,
        minlength: 1,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
    },
    gender: {
        type: String,
        required: true,
        minlength: 1,
        validate: (value) => ['male', 'female'].includes(value)
    },
    birthDate: {
        type: UserBirthDateSchema,
        required: true,
    },
});

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        unique: true,
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
    cartId: {
        type: mongoose.Schema.Types.ObjectId
    },
    wishList: {
        type: [mongoose.Schema.Types.ObjectId]
    },
    personalData: {
        type: UserPersonalDataSchema,
    },
    roll: {
        type: Number,
        default: 1,
        validate: (value) => [1, 2].includes(value)
    },
    tokens: [{
        access: {
            type: String,
            required: true,
        },
        expDate: {
            type: Number,
            required: true,
        },
        token: {
            type: String,
            required: true,
        },
        deviceIp: {
            type: String,
            required: true,
            validate: validator.isIP
        }
    }]
});

const USER_PROVIDERS = ['custom', 'google', 'facebook'];

module.exports = {
    UserPersonalDataSchema,
    UserSchema,
    USER_PROVIDERS
};