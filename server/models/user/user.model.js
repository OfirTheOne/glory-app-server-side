const { mongoose } = require('../../db/mongoose');

// token verification
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { FB, FacebookApiException } = require('fb');

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

    return _.pick(userObject, [
        '_id', 
        'authData.email', 
        'authData.provider', 
        'personalData', 
        'address',  
        'wishList'
    ]);
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
    user.authData.tokens = removeExpTokens(user.authData.tokens);
    if (!canGenerateToIP(user.authData.tokens, deviceIp)) {
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
    console.log(`removeToken : token ${token}`)
    const user = this;
    try {
        const removeRes = await user.update({
            $pull: {
                authData: {
                    tokens: { 
                        token 
                    }
                } 
            }
        });
        console.log(`removeToken : removeRes ${removeRes}`)        
        return removeRes
    } catch (e) {
        throw e;
    }
};

UserSchema.methods.addToken = async function (token) {
    const user = this;
    try {
        const isTokenExistsInArray = user.authData.tokens.some((element) => element.token == token);
        if (!isTokenExistsInArray) {
            return await user.update({
                $push: {
                    authData: {
                        tokens: {
                            token,
                            'access': 'auth'
                        }
                    }
                }
            });
        }
    } catch (e) {
        throw e;
    }
};

UserSchema.methods.setPersonalData = async function (data) {
    const user = this;
    // const personalData = new UserPersonalDataSchema(data);
    try {
        // await user.update();
        return await User.findByIdAndUpdate(
            user._id, 
            { $set: { personalData:  data } },
            { new: true }
        );
         
    } catch (e) {
        throw e;
    }
}

UserSchema.methods.matchPassword = async function (password) {
    const user = this;
    // const personalData = new UserPersonalDataSchema(data);
    try {
        return await bcrypt.compare(password, user.authData.password);
    } catch (e) {
        throw e;
    }
}


UserSchema.statics.createNewUser = function(email, provider, password) {
    const User = this;
    const user = new User({
        authData: {
            email, 
            provider,
            tokens: [],
            // in cases of google / facebook signing 'password' == undefined
            password 
        }
    });
    
    return user;
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

UserSchema.statics.findByTokenVerification = async function (req, token, provider) {
    console.log('method : findByTokenVerification(req, token, provider)');
    console.log(`params :\n req - ${req},\n token - ${token},\n provider - ${provider} \n`);

    const User = this;
    try {
        const verificationResult = await User.verifyToken(provider, token);
        let queryObj;
        switch (provider) {
            case 'custom': {
                console.log('case : custom');
                queryObj = {
                    _id: verificationResult._id,
                    'authData.provider': provider,
                    'authData.tokens.token': token,
                    'authData.tokens.access': 'auth'
                };
                break;
            }

            case 'google': {
                console.log('case : google');
                const payload = verificationResult.getPayload();
                req.authValue = payload['sub'];
                queryObj = {
                    'authData.email': payload.email,
                    'authData.provider': provider
                };
                break;
            }

            case 'facebook': {
                console.log('case : facebook');
                const verificationResult = await User.verifyFacebookToken(token);
                req.authValue = verificationResult.id;
                queryObj = {
                    'authData.email': verificationResult.email,
                    'authData.provider': provider
                };
                break;
            }

            default: break;
        }

        if(queryObj) {
            return await User.findOne(queryObj);
        }

    } catch (e) {
        // if throw TokenExpiredError must let the client know        
        throw e;
    }
};



// ---------
UserSchema.statics.verifyToken = async function (provider, token) {
    console.log('method : verifyToken(token, provider)');
    console.log(`params : provider - ${provider}, token - ${token} \n`);

    const User = this;
    let verificationResult;
    try {

        switch (provider) {
            case 'custom': {
                console.log('case : custom');
                verificationResult = await User.verifyCustomToken(token);
                break;
            }

            case 'google': {
                console.log('case : google');
                verificationResult = await User.verifyGoogleToken(token);
                break;
            }

            case 'facebook': {
                console.log('case : facebook');
                verificationResult = await User.verifyFacebookToken(token);
                break;
            }

            default:
                break;
        }

    } catch (e) {
        // if throw TokenExpiredError must let the client know        
        throw e;
    }
    return verificationResult;
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
    console.log('method : verifyGoogleToken(token)');
    console.log(`params :\n token - ${token} \n`);

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        console.log(ticket);
        return ticket;
    } catch (e) {
        throw e;
    }
};

UserSchema.statics.verifyFacebookToken = async function (token) {
    
    FB.options({ version: 'v2.4' });
    var fbRes = FB.extend({ 
        appId: process.env.FACEBOOK_APP_ID, 
        appSecret: process.env.FACEBOOK_APP_SECRET 
    });
    try {
        // doc - https://developers.facebook.com/docs/facebook-login/permissions/v3.0
        const res =  await FB.api('me', { fields: 'id,email,name,last_name', access_token: token });
        console.log(res);
        return res;

    } catch(e) {
        console.log(e);
        throw e;
    }
    console.log(res);

};

// ---------
UserSchema.statics.findUserByEmail = async function (email) {
    console.log(email);
    const User = this;

    try {
        const user = await User.findOne({authData: {  email }});
        if (!user) {
            throw new Error(`failed to find a user with the email : ${email}.`);
        }
        return user;

    } catch(e) {
        console.log(`from UserSchema.statics.findUserByEmail(${email}) : `, e)
        throw e;
    }


}

/**
 * exec before every save calling and make sure that the passward that beeing saved on the db 
 * are hashed .
 */
UserSchema.pre('save', async function (next) {
    const user = this;

    // if the 'save' method have not been called from POST: /user request, minning 
    // that the request is not for signing a new user, there for the user is allready signin
    // and the password is already encrypeted (= modified).
    if (user.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(user.authData.password, salt);
            user.authData.password = hash;
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