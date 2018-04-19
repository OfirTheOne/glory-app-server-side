
const usersRoute = require('express').Router();
const _ = require('lodash');
const { ObjectID } = require('mongodb');

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


// NOT IN USE
/**
 * Route for create new user / signup
 * */
// POST: /users/ 
usersRoute.post('/', async (req, res) => {

    // --1-- create new user object. validateion of the req body
    // is inside the User c'tor     
    const provider = req.body['provider'];

    const email = req.body['email'];

    const user = new User(_.pick(req.body, ['email', 'password', 'provider']));

    try {
        await user.save();
        const ownerId = user._id;
        const cart = new Cart({ ownerId })
        await cart.save();
        const tokenData = await user.generateAuthToken(req);
        res.header('x-auth', tokenData.token).send({ data: { user, tokenData } });
    } catch (e) {
        res.status(400).send(e);
    }

});

/**
 * Route for signup / signin user with facebook
 * */
// POST: /users/f
usersRoute.post('/f', async (req, res) => {

});


/**
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
// POST: /users/g
usersRoute.post('/g', async (req, res) => {

    const idToken = req.body['idToken'];
    const provider = 'google';

    // **** 1 **** - verifing the idToken
    let ticket;
    try {
        ticket = await User.verifyGoogleToken(idToken);
    } catch (e) {
        return res.status(400).send(e);
    }


    // **** 2 **** - pulling the user data from the payload object
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
        user = User.findUserByEmail(email);
    } catch (e) {
        // there is no user with that email
        console.log(e);
    }


    // **** 3 **** - handeling two cases : SIGNIN & SIGNUP
    if (user) {  // SIGN-IN
        // if the user exists in the db 
        if (user.provider != provider) {
            // if the email exists but with other provider than google,
            // the user allready sign up with the same email but using facebook or custom
            return res.status(400).send('user email dont match the provider');
        }

        try {
            await user.addToken(idToken);
            res.status(200).send({ data: { userId: payload['sub']} });
        } catch (e) {
            console.log(e);
        }
    } 
    else { // SIGN-UP
        // if the user dont exists in the db 
        user = new User({ email, provider })
        try {
            await user.save();

            await user.setPersonalData({
                email,
                lastName: payload['family_name'],
                fisrtName: payload['given_name']

            }) 

            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();

            // note to self : the returning of the userId to the client have a data integrity minning - by compering 
            // the returned userId value with the one the client possess can detect any interaption in the sending of the idtoken 
            // from the client to the server.
            res.status(200).send({ data: { userId: payload['sub'], user} });
        } catch (e) {
            res.status(400).send(e);
        }
    }
});


/**
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
// POST: /users/c
usersRoute.post('/c', async (req, res) => {

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
            res.header('x-auth', tokenData.token).send({ data: { user, tokenData } });

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
            await user.setPersonalData(req.body.data);

            // creating new cart
            const ownerId = user._id;
            const cart = new Cart({ ownerId })
            await cart.save();

            // generate token / if cant generate token --> throw Error
            const tokenData = await user.generateAuthToken(req);
            console.log(tokenData);
            res.header('x-auth', tokenData.token).send({ data: { user, tokenData } });

        } catch (e) {
            res.status(400).send(e);
        }
    }

});


const validateCustomSignRequest = (reqBody) => {
    if ((reqBody.email == undefined || reqBody.email == null) || (reqBody.password == undefined || reqBody.password == null)) {
        return false;
    } else {
        return true;
    }
}
/**
 * Route for getting user by a token / the user object of the logged user
 * */
// GET: /users/me
usersRoute.get('/me', authenticate, (req, res) => {
    res.send(req.user);
});


// NOT IN USE
/**
 * Route for loggin a user by email & pass
 * */
// POST: /users/login
usersRoute.post('/login', async (req, res) => {
    console.log(req.ip, req.connection.remoteAddress);
    var body = _.pick(req.body, ['email', 'password']);
    try {
        // if cant find user --> throw Error
        const user = await User.findByCredentials(body.email, body.password);
        console.log(user);
        // if cant generate token --> throw Error
        const tokenData = await user.generateAuthToken(req);
        console.log(tokenData);
        res.header('x-auth', tokenData.token).send({ data: { user, tokenData } });
    } catch (e) {
        res.status(401).send(e);
    }
});

/**
 * Route for deltng token / signout user
 * */
// DELETE: /users/me/token
usersRoute.delete('/me/token', authenticate, async (req, res) => {
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


