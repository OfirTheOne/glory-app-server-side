const { mongoose } = require('../../db/mongoose');

// token verification
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const _ = require('lodash');

let { UserSchema, UserPersonalDataSchema, USER_PROVIDERS } = require('./user.schema');

// validate custom jwt related config variable 
const jwtTimeOut = (3 * 60 * 60); // 3 h exp T.O for token
const jwtAmountPerIP = 5; // amount of tokens that can be generate per ip



/** @description .
 *      #### overriding the toJSON method.
 * by that, every time sending a user object in result, only _id, email, provider and personalData
 * fields will by send.
 */
UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    return _.pick(userObject, ['_id', 'email', 'provider', 'personalData']);
}

/** @description .
 *      #### Generating new auth token.
 *      1. fetching the income request IP address.
 *      2. remove all expeired tokens from the user token array.
 *      3. itrate al the valides tokens and check if there's more then 5 tokens from this IP
 *      address, if so, throw Error, else generate new token.
 * @param {Object} req the incoming user request .
 */
UserSchema.methods.generateAuthToken = async function (req) {
    const user = this;
    const access = 'auth';
    const expDate = Math.floor(Date.now() / 1000) + jwtTimeOut;

    const deviceIp = req.connection.remoteAddress || req.ip;
    // remove all expired / invalid tokens
    user.tokens = removeExpTokens(user.tokens);
    if (!canGenerateToIP(user.tokens, deviceIp)) {
        throw new Error('Exceeded tokens amount for this ip');
    }
    const token = jwt.sign(
        {
            _id: user._id.toHexString(),
            access,
            exp: expDate
        },
        process.env.JWT_SECRET
    ).toString();

    // add the new token
    user.tokens = user.tokens.concat([{ access, expDate, token, deviceIp }]);
    await user.save();
    return { token, expDate };
};

/** @description .
 *      #### Remove all expeired /invalid tokens from the user token array.
 * @param {Object[]} tokens user token array .
 */
const removeExpTokens = (tokens) => {
    return tokens.filter((tokenObject) => {
        try {
            jwt.verify(tokenObject.token, process.env.JWT_SECRET);
        } catch (e) {
            return false;
        }
        return true;
    });
};

/** @description .
 *      #### chack if the amount of valide tokens is higher then jwtAmountPerIP.
 * @param {Object[]} tokens user token array .
 * @param {String} deviceIp income request IP address .
 */
const canGenerateToIP = (tokens, deviceIp) => {
    let tokensWithThisIp = 0;
    tokens.forEach(tokenObject => {
        if (tokenObject.deviceIp === deviceIp) {
            tokensWithThisIp++;
        }
    });

    if (tokensWithThisIp >= jwtAmountPerIP) {
        return false;
    } else {
        return true;
    }
};


UserSchema.methods.removeToken = async function (token) {
    const user = this;
    try {
        return await user.update({
            $pull: {
                tokens: { token }
            }
        });
    } catch (e) {
        throw e;
    }
};

UserSchema.methods.addToken = async function (token) {
    const user = this;
    try {
        return await user.update({
            $push: {
                tokens: { token }
            }
        });
    } catch (e) {
        throw e;
    }
};

UserSchema.methods.setPersonalData = async function (data) {
    const user = this;
    // const personalData = new UserPersonalDataSchema(data);
    try {
        return await user.update({
            $set: {
                personalData: { data }
            }
        });
    } catch (e) {
        throw e;
    }
}

UserSchema.methods.matchPassword = async function (password) {
    const user = this;
    // const personalData = new UserPersonalDataSchema(data);
    try {
        return await bcrypt.compare(password, user.password);
    } catch (e) {
        throw e;
    }
}


UserSchema.statics.findByCredentials = async function (email, password) {
    const User = this;
    const user = await User.findUserByEmail(email);

    const res = user.matchPassword(password);
    if (res) {
        return user;
    } else {
        throw new Error('password failed.');
    }
};

UserSchema.statics.findByToken = async function (req, token, provider) {
    const User = this;
    try {

        switch (provider) {
            case 'custom':

                const decoded = User.verifyCustomToken(token);
                return await User.findOne({
                    _id: decoded._id,
                    'tokens.token': token,
                    'tokens.access': 'auth'
                });

            case 'google':

                const ticket = User.verifyCustomToken(token);
                const payload = ticket.getPayload();
                const user = await User.findOne({
                    email: payload.email,
                    provider,
                    'tokens.token': token,
                    'tokens.access': 'auth'
                });
                req.authValue = payload['sub'];
                return user;

            case 'facebook':

                break;
            default:
                break;
        }

    } catch (e) {
        // if throw TokenExpiredError must let the client know        
        throw e;
    }
};

UserSchema.statics.verifyCustomToken = async function (token) {
    var decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (e) {
        // if throw TokenExpiredError must let the client know        
        throw e;
    }
};

UserSchema.statics.verifyGoogleToken = async function (token) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID );
    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID 
        });
        return ticket;
    } catch (e) {
        throw e;
    }
};

UserSchema.statics.verifyFacebookToken = async function (token) {

};


UserSchema.statics.findUserByEmail = async function (email) {
    console.log(email);
    const User = this;
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error(`failed to find a user with the email : ${email}.`);
    }

    return user;

}


UserSchema.pre('save', async function (next) {
    const user = this;

    // if the 'save' method have not been called from POST: /user request, minning 
    // that the request is not for signing a new user, there for the user is allready signin
    // and the password is already encrypeted (= modified).
    if (user.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(user.password, salt);
            user.password = hash;
            next();
        } catch (e) {
            next(e);
        }
    } else {
        next();
    }

});

var User = mongoose.model('User', UserSchema);

module.exports = {
    User,
    USER_PROVIDERS
};