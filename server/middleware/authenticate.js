const { User } = require('../models/user/user.model');

const authenticate = async (req, res, next) => {
    const token = req.header('x-auth');
    const provider = req.body.provider;
s
    try {
        const user = await User.findByToken(token, provider);

        if (!user) {
            throw new Error();
        }
        req.user = user;
        req.token = token;
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

    try {
        const user = await User.findByToken(token);

        if (!user || user.roll !== 2) {
            throw new Error();
        }
        req.user = user;
        req.token = token;
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