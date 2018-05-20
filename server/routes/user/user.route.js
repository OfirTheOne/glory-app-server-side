
const usersRoute = require('express').Router();
const _ = require('lodash');
const validator = require('validator');
const { ObjectID } = require('mongodb');
const { Logger, LogLevel, LogStream } = require('../../utils/logger-service/logger.service');

// mongoose models
const { User, USER_PROVIDERS } = require('../../models/user/user.model');
const { Cart } = require('../../models/cart/cart.model');

// middleware
const { authenticate } = require('../../middleware/authenticate');

// sub-routes
const { cartRoute } = require('./cart/cart.route'); // sub-route '/cart' of '/users' 
const { wishRoute } = require('./wish/wish.route'); // sub-route '/wish' of '/users' 
usersRoute.use('/cart', cartRoute); // connecting the '/cart' route to '/user' route
usersRoute.use('/wish', wishRoute); // connecting the '/wish' route to '/user' route

// set logger service object
const logger = new Logger(LogStream.DATABASE);


/********* routes *********/


/** POST: /users/f 
 * Route for signup / signin user with facebook
 * */
usersRoute.post('/f', async (req, res) => {
    logger.logMassage(LogLevel.INFO, `POST: /users/f`, `Entry`, req.body);

    const idToken = req.body['idToken'];
    const provider = 'facebook';

    // ****** Position 1 ****** // - Verifing idToken
    // ******************************************************************* //
    let authTokenRes;
    try {
        authTokenRes = await User.verifyFacebookToken(idToken);
        logger.logMassage(LogLevel.DEBUG, `POST: /users/f`, `Verifing idToken - authTokenRes :`, authTokenRes);

        console.log(JSON.stringify(authTokenRes, undefined, 2));
    } catch (e) {
        logger.logMassage(LogLevel.ERROR, `POST: /users/f`, `Verifing idToken`, e);
        return res.status(400).send(e);
    }


    // ****** Position 2 ****** // - Find user obj 
    // ******************************************************************* //
    /**
     *  { "email": "" , "id": "", "name": "", "last_name": "" }
     */
    const email = authTokenRes['email'];
    let user;
    try {
        user = await User.findUserByEmail(email);
        logger.logMassage(LogLevel.DEBUG, `POST: /users/f`, `Find user obj - user :`, user);

    } catch (e) {
        // there is no user with that email
        logger.logMassage(LogLevel.ERROR, `POST: /users/f`, `Find user obj`, e);
        console.log(e);
    }


    // ****** Position 3 ****** // - Handeling two cases : SIGNIN & SIGNUP
    // ******************************************************************* //
    console.log(`step 3`);
    if (user) {  
        // SIGN-IN
        console.log(`step 3 - SIGN-IN`);
        logger.logMassage(LogLevel.INFO, `POST: /users/f`, `SIGN-IN`, '');

        // if the user exists in the db 
        if (user.provider != provider) {
            // if the email exists but with other provider than facebook,
            // the user allready sign up with the same email but using google or custom
            return res.status(400).send('user email dont match the provider');
        }

        try {
            await user.addToken(idToken);
            logger.logMassage(LogLevel.DEBUG, `POST: /users/f`, `End, SIGN-IN`, '');
            console.log(`finished step 3 - SIGN-IN`);

            res.status(200).send({
                data: {
                    signin: true,
                    authValue: authTokenRes['id'],
                    user
                }
            });
        } catch (e) {
            logger.logMassage(LogLevel.ERROR, `POST: /users/f`, `End, SIGN-IN`, e);
            console.log(e);
        }
    }
    else { 
        // SIGN-UP
        logger.logMassage(LogLevel.INFO, `POST: /users/f`, `SIGN-UP`, '');
        console.log(`step 3 - SIGN-UP`);

        // if the user dont exists in the db 
        user = new User({ email, provider })
        try {
            await user.setPersonalData({
                email,
                lastName: authTokenRes['last_name'],
                fisrtName: authTokenRes['name']

            })

            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();
            await user.addToken(idToken);

            console.log(`finished step 3 - SIGN-UP`);
            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            res.status(200).send({
                data: {
                    signup: true,
                    authValue: authTokenRes['id'],
                    user
                }
            });
        } catch (e) {
            logger.logMassage(LogLevel.ERROR, `POST: /users/f`, `End, SIGN-UP`, e);
            res.status(400).send(e);
        }
    }
});

/** POST: /users/g 
 * Route for signup / signin user with google
 * expecting in the body : 
 *  {
 *      idToken
 *  }
 * 
 * doc : 
 *  https://developers.google.com/identity/sign-in/web/backend-auth
 *  https://google.github.io/google-auth-library-nodejs/classes/_auth_loginticket_.loginticket.html
 * */
usersRoute.post('/g', async (req, res) => {
    logger.logMassage(LogLevel.INFO, `POST: /users/g`, `Entry`, req);
    const idToken = req.body['idToken'];
    const provider = 'google';

    // ****** Position 1 ****** // - Verifing idToken
    // ******************************************************************* //
    let ticket;
    try {
        ticket = await User.verifyGoogleToken(idToken);
    } catch (e) {
        return res.status(400).send(e);
    }



    // ****** Position 2 ****** // - find user obj
    // ******************************************************************* //
    /*
    * the payload object contains : 
    *  iss: string;  at_hash?: string;  email_verified?: boolean;  sub: string;  azp?: string;
    *  email?: string;  profile?: string;  picture?: string;  name?: string;  given_name?: string;
    *  family_name?: string;  aud: string;  iat: number;  exp: number;  nonce?: string;  hd?: string;
    * */

    const payload = ticket.getPayload();
    const email = payload['email'];
    let user;

    try {
        user = await User.findUserByEmail(email);
    } catch (e) {
        // there is no user with that email
        console.log(e);
    }



    // ****** Position 3 ****** // - handeling two cases : SIGNIN & SIGNUP
    // ******************************************************************* //
    if (user) {  
        // SIGN-IN
        // if the user exists in the db 
        if (user.provider != provider) {
            // if the email exists but with other provider than google,
            // the user allready sign up with the same email but using facebook or custom
            return res.status(400).send('user email dont match the provider');
        }

        try {
            await user.addToken(idToken);
            res.status(200).send({
                data: {
                    signin: true,
                    authValue: payload['sub'],
                    user
                }
            });
        } catch (e) {
            console.log(e);
        }
    }
    else { // SIGN-UP
        // if the user dont exists in the db 
        user = new User({ email, provider })
        try {
            await user.setPersonalData({
                email,
                lastName: payload['family_name'],
                fisrtName: payload['given_name']

            })

            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();
            await user.addToken(idToken);

            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            res.status(200).send({
                data: {
                    signup: true,
                    authValue: payload['sub'],
                    user
                }
            });
        } catch (e) {
            res.status(400).send(e);
        }
    }
});

/** POST: /users/c 
 * Route for signup / signin user with my custom system
 * expecting in the body : 
 *  {
 *       email ,
 *       password, 
 *       data? {
 *           ...
 *       }
 *  }
 * */
usersRoute.post('/c', async (req, res) => {
    logger.logMassage(LogLevel.INFO, `POST: /users/c`, `Entry`, req.body);

    // **** 1 **** - validateion of the req body
    if (!validateCustomSignRequest(req.body)) {
        return res.status(400).send('request body missing parameters.');
    }


    // **** 2 **** - find the user by email - chack what is the case ? sign in or sign up
    const email = req.body.email;
    const provider = 'custom';
    try {
        user = User.findUserByEmail(email);
    } catch (e) {
        // there is no user with that email
        console.log(e);
    }


    // **** 3 **** - handeling two cases : SIGNIN & SIGNUP

    if (user) {  //   -   SIGN-IN   -
        // if the user exists in the db 
        if (user.provider != provider) {
            // if the email exists but with other provider than google,
            // the user allready sign up with the same email but using facebook or custom
            return res.status(400).send('user email dont match the provider');
        }
        try {
            // chack password
            const res = await user.matchPassword(req.body.password);
            if (!res) {
                // the password did not match
                return res.status(400);
            }
            // generate token / if cant generate token --> throw Error
            const tokenData = await user.generateAuthToken(req);
            console.log(tokenData);
            res.header('x-auth', tokenData.token).send({
                data: {
                    signin: true,
                    user,
                    tokenData,
                    dataDefined: isUserDataDefined(user)
                }
            });

        } catch (e) {
            console.log(e);
        }

    }
    else {  //   -   SIGN-UP   -
        // if the user dont exists in the db 

        user = new User({
            email,
            provider,
            password: req.body.password
        });
        try {
            // saving the new user
            await user.save();

            // updating his personal data
            let dataDefined = false;
            if (req.body.data != undefined) {
                await user.setPersonalData(req.body.data);
                dataDefined = true;
            }

            // creating new cart
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();

            // generate token / if cant generate token --> throw Error
            const tokenData = await user.generateAuthToken(req);
            console.log(tokenData);
            res.header('x-auth', tokenData.token).send({
                data: {
                    signup: true,
                    user,
                    tokenData,
                    dataDefined
                }
            });

        } catch (e) {
            res.status(400).send(e);
        }
    }

});

/** POST: /users/data 
 * Route for submiting user data
 * */
usersRoute.post('/data', authenticate, async (req, res) => {
    logger.logMassage(LogLevel.INFO, `POST: /users/data`, `Entry`, req.body);

    const data = _.pick(req.body, ['lastName', 'firstName', 'birthDate', 'gender'])
    if (validateUserData(req.body)) {
        const user = req.user;
        try {
            await user.setPersonalData(data);
            res.send();
        } catch (e) {
            console.log(e);
            res.status(400).send(e);
        }
    } else {
        res.status(400).send('user data invalid.');
    }

});

/** GET: /users/me 
 * Route for getting user by a token / the user object of the logged user
 * */
usersRoute.get('/me', authenticate, (req, res) => {
    logger.logMassage(LogLevel.INFO, `GET: /me`, `Entry`, req.body);

    res.send({
        data: {
            authValue: req.authValue,
            user: req.user,
            dataDefined: isUserDataDefined(req.user)
        }
    });
});

/** DELETE: /users/me/token 
 * Route for deltng token / signout user
 * */
usersRoute.delete('/me/token', authenticate, async (req, res) => {
    logger.logMassage(LogLevel.INFO, `DELETE: /me/token`, `Entry`, req);

    var user = req.user;
    try {
        const resulte = await user.removeToken(req.token);
        console.log(resulte);
        res.send();
    } catch (e) {
        res.status(400).send(e);
    }

})


module.exports = {
    usersRoute
}

 
/********* validators *********/

/** validation 
 * @param {*} reqBody 
 */
const validateCustomSignRequest = (reqBody) => {
    if ((reqBody.email == undefined || reqBody.email == null) || (reqBody.password == undefined || reqBody.password == null)) {
        return false;
    } else {
        return true;
    }
}

/** validation 
 * @param {Object} data validate that if a field exists it's value valide.
 * @returns true if all the existed fileds are valide.
 */
const validateUserData = (data) => {
    if (data.lastName != undefined && data.lastName != null) {
        if (!validator.isAlpha(data.lastName)) {
            return false;
        }
    }
    if (data.firstName != undefined && data.firstName != null) {
        if (!validator.isAlpha(data.firstName)) {
            return false;
        }
    }
    if (data.birthDate != undefined && data.birthDate != null) {
        if (!validateBirthDate(data.birthDate)) {
            return false;
        }
    }
    if (data.gender != undefined && data.gender != null) {
        if (!['male', 'female'].includes(data.gender)) {
            return false;
        }
    }
}

/** validation 
 * @param { Object } birthDate contains year, month, day fields.
 * @returns true if the fields year, month, day all numeric and follow the calender rulls. 
 */
const validateBirthDate = (birthDate) => {

    try {
        const y = parseInt(birthDate.year);
        const m = parseInt(birthDate.month);
        const d = parseInt(birthDate.day);
        const curYear = new Date().getFullYear();
        if (!_.inRange(y, 1900, curYear)) {
            return false;
        }
        if (!_.inRange(m, 1, 12)) {
            return false;
        }
        switch (m) {
            case 2:
                if ((y % 4 == 0 && _.inRange(d, 1, 29)) || _.inRange(d, 1, 28)) {
                    return true;
                }
                break;
            case 1 | 3 | 5 | 7 | 8 | 10 | 12:
                if (_.inRange(d, 1, 31)) {
                    return true;
                }
                break;

            default:
                if (_.inRange(d, 1, 30)) {
                    return true;
                }
                break;
        }
        return false;
    } catch (e) {
        console.log(e);
        return false;
    }
}

const isUserDataDefined = (user) => {
    let isDefine = (user.personalData != undefined) && (user.personalData.firstName != undefined);
    return isDefine;
}
