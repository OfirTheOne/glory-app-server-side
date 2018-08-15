
const usersRoute = require('express').Router();
const _ = require('lodash');
const validator = require('validator');
const { ValidationService } = require('../../utils/custom-validation-service/validation.servic')

const { Logger, LogStream } = require('../../utils/logger-service/logger.service');

// mongoose models
const { User } = require('../../models/user/user.model');
const { Cart } = require('../../models/cart/cart.model');

// middleware
const { authenticate } = require('../../middleware/authenticate');

// sub-routes
const { cartRoute } = require('./cart/cart.route'); // sub-route '/cart' of '/users' 
const { wishRoute } = require('./wish/wish.route'); // sub-route '/wish' of '/users' 
// const { orderRoute } = require('./order/order.route'); // sub-route '/order' of '/users' 
usersRoute.use('/cart', cartRoute); // connecting the '/cart' route to '/user' route
usersRoute.use('/wish', wishRoute); // connecting the '/wish' route to '/user' route
// usersRoute.use('/order', orderRoute); // connecting the '/order' route to '/user' route


// StripeJs
const stripe = require("stripe")("sk_test_a0WbK4VPDDW0OLPc8FJROwjd");


// set logger service object
const logger = new Logger(LogStream.CONSOLE);


// ***** routes for db maganment ***** // add admin authentication

usersRoute.get('/', async (req, res) => {
    /** GET: /users/
     * Route for getting all users 
     * */
    logger.info(`GET: /users`, `Enter`);

    try {
        const users = await User.find({})
            .select({
                'authData.provider': 1,
                'authData.email': 1,
                address: 1,
                personalData: 1,
                cartId: 1,
                wishList: 1
            });
        logger.info(`GET: /users`, `Exit`);
        return res.send({ data: users });

    } catch (error) {
        logger.error(`GET: /users`, `fail fetching all users.`, { params: { error } });
        return res.status(404).send(error);
    }
});



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
    let authTokenResult;
    try {
        authTokenResult = await User.verifyFacebookToken(idToken);
    } catch (e) {
        logger.error(`POST: /users/f`, `verifyFacebookToken failed.`, { params: { error: e } });
        return res.status(400).send(e);
    }

    // ****** Position 2 ****** // - Find user obj 
    // ******************************************************************* //
    /**
     *  { "email": "" , "id": "", "name": "", "last_name": "" }
     */
    const email = authTokenResult['email'];
    let user;
    try {
        user = await User.findUserByEmail(email);

    } catch (e) {
        // there is no user with that email
        logger.error(`POST: /users/f`, `findUserByEmail failed - there is no user with that email.`, {
            params: { error: e }
        });
        console.log(e);
    }

    // ****** Position 3 ****** // - Handeling two cases : SIGNIN & SIGNUP
    // ******************************************************************* //
    if (user) {
        // if the user exists in the db 
        console.log(`start step 3 - SIGN-IN`);
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
                    authValue: authTokenResult['id'],
                    user
                }
            });
        } catch (e) {
            console.log(e);
        }
    }
    else {
        // if the user dont exists in the db 
        console.log(`start step 3 - SIGN-UP`);
        let customerId;
        try {
            const customer = await createCustomer(email);
            console.log(customer);
            customerId = customer.id;
        } catch (error) {
            console.log(error);
        }

        try {
            user = await (new User({
                authData: { email, provider },
                personalData: {
                    lastName: authTokenResult['last_name'],
                    firstName: authTokenResult['name']
                },
                paymentMethods: { customerId }
            })).save();
            console.log(`create and store new user : ` + JSON.stringify(user, undefined, 2));
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();
            // await user.addToken(idToken);

            console.log(`finished step 3 - SIGN-UP`);
            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            logger.info(`POST: /users/f`, `Exit`);
            return res.status(200).send({
                data: {
                    signup: true,
                    authValue: authTokenResult['id'],
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
    let authTokenResult;
    try { //
        authTokenResult = await User.verifyGoogleToken(idToken);
    } catch (e) {
        logger.error(`POST: /users/f`, `verifyGoogleToken failed.`, { params: { error: e } });
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

    const payload = authTokenResult.getPayload();
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
        // if the user exists in the db 
        console.log(`start step 3 - SIGN-IN`);
        if (user.authData.provider != provider) {
            // if the email exists but with other provider than google,
            // the user allready sign up with the same email but using facebook or custom
            return res.status(400).send('user email dont match the provider');
        }

        try {
            await user.addToken(idToken);
            console.log(`finishs step 3 - SIGN-IN`);
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
    else {

        // if the user dont exists in the db 
        console.log(`start step 3 - SIGN-UP`);

        let customerId;
        try {
            const customer = await createCustomer(email);
            console.log(customer);
            customerId = customer.id;
        } catch (error) {
            console.log(error);
        }

        try {
            user = new User({
                authData: { email, provider },
                personalData: {
                    lastName: payload['family_name'],
                    firstName: payload['given_name']
                },
                paymentMethods: { customerId }
            });
            await user.save();

            console.log(`create and store new user : ` + JSON.stringify(user, undefined, 2));
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();

            // await user.addToken(idToken);

            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            console.log(`finishs step 3 - SIGN-UP`);

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
    if (!validateRequestBody__POST_users_c(req.body)) {
        return res.status(400).send('request body missing parameters.');
    }

    // **** 2 **** - find the user by email - chack what is the case ? sign in or sign up
    const email = req.body.email;
    const provider = 'custom';
    try {
        user = User.findUserByEmail(email);
    } catch (e) {
        // there is no user with that email
        logger.warn(`POST: /users/f`, `findUserByEmail failed - there is no user with that email.`, { params: { error: e } });
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
        
        let customerId;
        try {
            const customer = await createCustomer(email);
            console.log(customer);
            customerId = customer.id;
        } catch (error) {
            console.log(error);
        }

        try {
            // saving the new user
            user = await new User({
                authData: {
                    email,
                    provider,
                    password: req.body.password
                },
                paymentMethods: { customerId }
            }).save();

            // updating his personal data
            let dataDefined = false;
            if (req.body.data != undefined) {
                await user.setUserData(req.body.data);
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

    let data = _.pick(req.body.data, ['personalData', 'address']);

    logger.info(`POST: /users/data`, ``, { params: { data } });

    const user = req.user;
    console.log('user : ', user);
    if (validateRequestBody__POST_users_data(data)) {
        console.log('******** after validation.');
        try {
            const updateUser = await user.setUserData(data);
            logger.info(`POST: /users/data`, `Exit`, { params: { updateUser } });
            return res.send({
                data: {
                    user: updateUser,
                    authValue: req.authValue,
                }
            });
        } catch (error) {
            logger.error(`POST: /users/data`, `error at setUserData method.`, {
                params: { user, error }
            });
            return res.status(400).send(error);
        }
    } else {
        logger.warn(`POST: /users/data`, `validateRequestBody__POST_users_data return false.`, {
            params: { user }
        });
        return res.status(400).send('user data invalid.');
    }

});


usersRoute.post('/source', authenticate, async (req, res) => {
    // var stripe = require("stripe")("sk_test_a0WbK4VPDDW0OLPc8FJROwjd");
    const user = req.user;
    const { source } = req.body;

    const customerId = user.paymentMethods ? user.paymentMethods.customerId : undefined;

    if (!customerId) { // error customerId not defined
        console.log('customerId not defined');  
        return res.status(401).send('customerId not defined');
    
    } else if (!source) {
        console.log('source not defined');  
        return res.status(401).send('source not defined');

    } else { // existing customer and source defined
        
        // update the stripe-customer with the new source
        try {
            const result = await stripe.customers.update(
                customerId, 
                { source: source.id }
            );
            console.log(result);
        } catch (error) {
            console.log(error);
            return res.status(401).send(error);
        }

        // store in the db the needed parameters from the source
        try {
            const storeableSourceData = {
                sourceId: source.id, 
                // exp_year: source.card.exp_year, 
                brand: source.card.brand,
                last4: source.last4,
                metadata: source.metadata
            }
            user.paymentMethods.sources.push(storeableSourceData);
            await user.save();
            return res.send({data: {
                user,
                authValue: req.authValue,
            }});
        } catch (error) {
            console.log(error);
            return res.status(401).send(error);
        }
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

            default: break;
        }
    } catch (e) {
        logger.error(`POST: /me/token`, `token validation failed.`, { params: { error: e } });
        return res.status(401).send(e);
    }

    if (!userEmail || !authValue) {
        logger.warn(`POST: /me/token`, `userEmail or authValue undefined.`, {
            params: { userEmail, authValue }
        });
        return res.status(401).send();
    }

    // the authValue check is for security purposes. 
    if (user.email == userEmail && req.authValue == authValue) {
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
            logger.error(`POST: /me/token`, `token swaping failed.`, { params: { error: e } });
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
        logger.error(`DELETE: /me/token`, `removeToken failed.`, { params: { error: e } });
        return res.status(400).send(e);
    }

})


module.exports = {
    usersRoute
}


const createCustomer = async (email) => {

    try {
        const customer = await stripe.customers.create({
            email,
        });
        return customer;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/********* validators *********/

/** validation 
 * @param {Object} reqBody 
 */
const validateRequestBody__POST_users_c = (reqBody) => {
    const signData = _.pick(reqBody, [
        'email',
        'password'
    ])

    if (ValidationService.isString(signData.email) &&
        !ValidationService.isStringUndefinedOrEmpty(signData.email) &&
        ValidationService.isString(signData.password) &&
        !ValidationService.isStringUndefinedOrEmpty(signData.password)) {
        return true;
    }
}

/** validation 
 * @param {Object} data - contains fileds : firstName, lastName, birthDate and gender.
 *
 * @returns true if all the existed fileds are valide.
 */
const validateRequestBody__POST_users_data = (data) => {
    const personalData = _.pick(data.personalData, [
        'lastName',
        'firstName',
        'birthDate',
        'gender'
    ]);
    const addressData = _.pick(data.address, [
        'country',
        'city',
        'address',
        'postcode'
    ]);
    console.log(personalData, addressData);

    console.log('HERE 000001');
    if (!ValidationService.isObjectEmpty(personalData)) {
        console.log('HERE 000002');
        if (ValidationService.isStringTrimAlpaWordsSeries(personalData.lastName) &&
            ValidationService.isStringTrimAlpaWordsSeries(personalData.firstName) &&
            ValidationService.isString(personalData.gender) &&
            ['male', 'female'].includes(personalData.gender) &&
            !ValidationService.isObjectEmpty(personalData.birthDate) &&
            !ValidationService.validateBirthDateObject(personalData.birthDate)) {
            return true;
        }
    } else if (!ValidationService.isObjectEmpty(addressData)) {
        console.log('HERE 000003');
        if (ValidationService.isStringTrimAlpaWordsSeries(addressData.country) &&
            ValidationService.isStringTrimAlpaWordsSeries(addressData.city) &&
            ValidationService.isStringTrimAlpaWordsSeries(addressData.address) &&
            ValidationService.isParseILPostcode(addressData.postcode)) {
            return true;
        }

    }
}



const isUserDataDefined = (user) => {
    let isDefine = (user.personalData != undefined) && (user.personalData.firstName != undefined);
    return isDefine;
}

