const { User } = require('../models/user/user.model');

const authenticate = async (req, res, next) => {
    console.log('method : authenticate(req, res, next)');

    const token = req.header('x-auth');
    const provider = req.header('x-provider');
  
    try {
        const user = await User.findByToken(req, token, provider);
       
        if (!user) {
            console.log('(from - authenticate) cant find user');
            throw new Error('cant find user');
        }
        req.user = user;
        req.token = token;
        console.log('(from - authenticate) end authenticate middleware');
        next();

    } catch (e) {
        // if the token expired - remove it from the user tokens and sending the relevent error
        if (e.message === 'jwt expired') {
            // await user.removeToken(token);
            res.status(401).send({ jwtExpError: e });
        } else {
            res.status(401).send(e);
        }

    }

};

const authenticateAdmin = async (req, res, next) => {
    const token = req.header('x-auth');
    const provider = req.header('x-provider');

    try {
        const user = await User.findByToken(req, token, provider);

        if (!user || user.roll !== 2) {
            throw new Error('cant find user or the user is not an admin');
        }
        req.user = user;
        req.token = token;
        console.log('end authenticateAdmin middleware');
        next();

    } catch (e) {
        // if the token expired - remove it from the user tokens and sending the relevent error
        if (e.message === 'jwt expired') {
            // await user.removeToken(token);
            res.status(401).send({ jwtExpError: e });
        } else {
            res.status(401).send(e);
        }

    }
};

module.exports = {
    authenticate,
    authenticateAdmin
};