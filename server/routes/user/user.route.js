
const usersRoute = require('express').Router();
const _ = require('lodash');
const validator = require('validator');
const { Logger, LogStream } = require('../../utils/logger-service/logger.service');

// mongoose models
const { User } = require('../../models/user/user.model');
const { Cart } = require('../../models/cart/cart.model');

// middleware
const { authenticate } = require('../../middleware/authenticate');

// sub-routes
const { cartRoute } = require('./cart/cart.route'); // sub-route '/cart' of '/users' 
const { wishRoute } = require('./wish/wish.route'); // sub-route '/wish' of '/users' 
usersRoute.use('/cart', cartRoute); // connecting the '/cart' route to '/user' route
usersRoute.use('/wish', wishRoute); // connecting the '/wish' route to '/user' route

// set logger service object
const logger = new Logger(LogStream.CONSOLE);


/********* routes *********/



usersRoute.post('/f', async (req, res) => {
/** POST: /users/f 
 * Route for signup / signin user with facebook
 * */
    logger.info(`POST: /users/f`, `Enter`);

    const idToken = req.body['idToken'];
    const provider = 'facebook';

    // ****** Position 1 ****** // - Verifing idToken
    // ******************************************************************* //
    let authTokenRes;
    try {
        authTokenRes = await User.verifyFacebookToken(idToken);

    } catch (e) {
        logger.error(`POST: /users/f`, `verifyFacebookToken failed.`, {params: {error: e}});
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

    } catch (e) {
        // there is no user with that email
        logger.error(`POST: /users/f`, `findUserByEmail failed - there is no user with that email.`, {
            params: {error: e}
        });
        console.log(e);
    }


    // ****** Position 3 ****** // - Handeling two cases : SIGNIN & SIGNUP
    // ******************************************************************* //
    if (user) {  
        // SIGN-IN

        // if the user exists in the db 
        if (user.authData.provider != provider) {
            // if the email exists but with other provider than facebook,
            // the user allready sign up with the same email but using google or custom
            logger.warn(`POST: /users/f`, `user email provider dont match the db provider.`);
            return res.status(400).send('user email provider dont match the db provider');
        }

        try {
            await user.addToken(idToken);

            return res.status(200).send({
                data: {
                    signin: true,
                    authValue: authTokenRes['id'],
                    user
                }
            });
        } catch (e) {
            console.log(e);
        }
    }
    else { 
        // SIGN-UP
        console.log(`step 3 - SIGN-UP`);

        // if the user dont exists in the db 
        user = new User();
        
        try {
            user.authData.email = email;
            user.authData.provider = provider;
            await user.save();

            await user.setPersonalData({
                email,
                lastName: authTokenRes['last_name'],
                fisrtName: authTokenRes['name']

            })

            await user.save();
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();
            await user.addToken(idToken);

            console.log(`finished step 3 - SIGN-UP`);
            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            logger.info(`POST: /users/f`, `Exit`);
            return res.status(200).send({
                data: {
                    signup: true,
                    authValue: authTokenRes['id'],
                    user
                }
            });
        } catch (e) {
            res.status(400).send(e);
        }
    }
});


usersRoute.post('/g', async (req, res) => {
/** POST: /users/g 
 * Route for signup / signin user with google
 * expecting in the body : 
 *  {
 *      idk0Token
 *  }
 * 
 * doc : 
 *  https://developers.google.com/identity/sign-in/web/backend-auth
 *  https://google.github.io/google-auth-library-nodejs/classes/_auth_loginticket_.loginticket.html
 * */    
    logger.info(`POST: /users/g`, `Enter`);
    const idToken = req.body['idToken'];
    const provider = 'google';

    // ****** Position 1 ****** // - Verifing idToken
    // ******************************************************************* //
    let ticket;
    try {
        ticket = await User.verifyGoogleToken(idToken);
    } catch (e) {
        logger.error(`POST: /users/f`, `verifyGoogleToken failed.`, {params: {error: e}});
        return res.status(400).send(new Error('token validetion failed.'));
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
        if (user.authData.provider != provider) {
            // if the email exists but with other provider than google,
            // the user allready sign up with the same email but using facebook or custom
            return res.status(400).send('user email dont match the provider');
        }

        try {
            await user.addToken(idToken);
            return res.status(200).send({
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
        console.log('SIGN-UP');
        user = await (new User({
                authData: {
                    email, 
                    provider
                }, 
                personalData: {
                    lastName: payload['family_name'],
                    firstName: payload['given_name']
                }
            })
        ).save(); // User.createNewUser(email, provider);

        console.log('************************************************ \n\n\n\n');
        console.log(JSON.stringify(user, undefined, 2));

        try {
            // user.authData.email = email;
            // user.authData.provider = provider;
            console.log('HERE 0000001')
            // await user.save();
            console.log('HERE 0000002')
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            console.log('HERE 0000003')
            await cart.save();
            console.log('HERE 0000004')
            await user.addToken(idToken);

            console.log('HERE 0000005')
        console.log(JSON.stringify(user, undefined, 2));
        console.log('HERE 0000006')

            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            return res.status(200).send({
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


usersRoute.post('/c', async (req, res) => {
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
    logger.info(`POST: /users/c`, `Enter`);

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
        logger.warn(`POST: /users/f`, `findUserByEmail failed - there is no user with that email.`, {params: {error: e}});
        console.log(e);
    }


    // **** 3 **** - handeling two cases : SIGNIN & SIGNUP

    if (user) {  //   -   SIGN-IN   -
        // if the user exists in the db 
        if (user.authData.provider != provider) {
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
            return res.header('x-auth', tokenData.token).send({
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
            authData: { 
                email,
                provider,
                password: req.body.password
            }
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
            return res.header('x-auth', tokenData.token).send({
                data: {
                    signup: true,
                    user,
                    tokenData,
                    dataDefined
                }
            });

        } catch (e) {
            return res.status(400).send(e);
        }
    }

});


usersRoute.post('/data', authenticate, async (req, res) => {
/** POST: /users/data 
 * Route for submiting user data
 * */
    logger.info(`POST: /users/data`, `Enter`);

    const data = _.pick(req.body.data, ['lastName', 'firstName', 'birthDate', 'gender']);
    logger.info(`POST: /users/data`, ``, { params : { data }});
    
    if (validateUserData(req.body)) {
        const user = req.user;
        try {
            const updateUser = await user.setPersonalData(data);  
            logger.info(`POST: /users/data`, `Exit`, { params: { updateUser } });
            return res.send({
                data: {
                    user: updateUser, 
                    authValue: req.authValue,
                }
            });  
        } catch (e) {
            logger.error(`POST: /users/data`, `error at setPersonalData method.`, {
                params: { user, error:  e }
            });
            return res.status(400).send(e);
        }
        /*
        try {
            await user.save();

        } catch(e) {
            logger.error(`POST: /users/data`, `error at user.save method.`, {
                params: { user, error:  e }
            });
            return res.status(400).send(e);
        }
        */
        

    } else {
        logger.warn(`POST: /users/data`, `validateUserData return false.`, {
            params: { user }
        });
        return res.status(400).send('user data invalid.');
    }

});


usersRoute.get('/me', authenticate, (req, res) => {
/** GET: /users/me 
 * Route for getting user by a token / the user object of the logged user
 * */
    logger.info(`GET: /users/me`, `Enter`);

    logger.info(`GET: /users/me`, `Exit`);
    return res.send({
        data: {
            authValue: req.authValue,
            user: req.user,
            dataDefined: isUserDataDefined(req.user)
        }
    });
});


usersRoute.post('/me/token', authenticate, async (req, res) => {
/** POST: /users/me/token 
 * Route for renew token with a new one (case of transparent sigin) / removing the 
 * x-auth token (that in the header) from the token array and edding the newToken that in the body.
 * */
    logger.info(`POST: /me/token`, `Enter`);

    var user = req.user;
    const provider = req.header('x-provider');
    const curToken = req.token;
    const newToken = req.body.newToken;
    let userEmail;
    let authValue;

    logger.info(`POST: /me/token`, `setting local vars.`, {
        params: { user }
    });
    
    // validate the newToken by the x-provider and pulling the email from the validation result.
    try {
        
        switch (provider) {
            case 'custom': {
                logger.info(`POST: /me/token`, `entered case custom.`);
                const verificationResult = await User.verifyCustomToken(newToken);
                userEmail = verificationResult.email;
                authValue = "";
                break;
            }
            
            case 'google': {
                logger.info(`POST: /me/token`, `entered case google.`);
                const verificationResult = await User.verifyGoogleToken(newToken);
                const payload = verificationResult.getPayload();
                userEmail = payload.email;
                authValue = payload['sub'];
                break;
            }
            
            case 'facebook': {
                logger.info(`POST: /me/token`, `entered case facebook.`);
                const verificationResult = await User.verifyFacebookToken(newToken);
                userEmail = verificationResult.email;
                authValue = verificationResult.id;
                break;
            }

            default:  break;
        }
    } catch (e) {
        logger.error(`POST: /me/token`, `token validation failed.`, { params: {error : e}});
        return res.status(401).send(e);
    }
    
    if(!userEmail || !authValue) {
        logger.warn(`POST: /me/token`, `userEmail or authValue undefined.`, { 
            params: { userEmail ,authValue }
        });
        return res.status(401).send();
    }

    // the authValue check is for security purposes. 
    if(user.email == userEmail && req.authValue == authValue) {
        try {
            await user.removeToken(curToken);
            await user.addToken(newToken);

            logger.info(`POST: /me/token`, `Exit`);
            return res.status(200).send({
                data: {
                    authValue,
                    user,
                    dataDefined: isUserDataDefined(user)
                }
            });
        } catch (e) {
            logger.error(`POST: /me/token`, `token swaping failed.`, { params: {error: e} });
            return res.status(401).send(e);
        }

    } else {
        logger.warn(`POST: /me/token`, `oldtoken and newtoken not matched.`);
        return res.status(401).send();
    }
})


usersRoute.delete('/me/token', authenticate, async (req, res) => {
/** DELETE: /users/me/token 
 * Route for deleting token / signout user
 * */
    logger.info(`DELETE: /me/token`, `Enter`);

    var user = req.user;
    try {
        const resulte = await user.removeToken(req.token);

        logger.info(`DELETE: /me/token`, `Exit`);
        return res.send();
    } catch (e) {
        logger.error(`DELETE: /me/token`, `removeToken failed.`, { params: {error: e} });
        return res.status(400).send(e);
    }

})


module.exports = {
    usersRoute
}

 
/********* validators *********/

/** validation 
 * @param {Object} reqBody 
 */
const validateCustomSignRequest = (reqBody) => {
    if ((reqBody.email == undefined || reqBody.email == null) || (reqBody.password == undefined || reqBody.password == null)) {
        return false;
    } else {
        return true;
    }
}

/** validation 
 * @description - validate that if a field exists is value valide.
 * @param {Object} data - contains fileds : firstName, lastName, birthDate and gender.
 *
 * @returns true if all the existed fileds are valide.
 */
const validateUserData = (data) => {
    if (data.lastName !== undefined && data.lastName != null) {
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
    return true;
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
