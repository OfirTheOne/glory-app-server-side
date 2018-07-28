const { User } = require('../models/user/user.model');
const { Logger, LogStream } = require('../utils/logger-service/logger.service');
const { ERROR } = require('../error/error');
const logger = new Logger(LogStream.CONSOLE);


const authenticate = async (req, res, next) => {
    logger.info(`authenticate(req, res, next)`, `Enter`);

    const token = req.header('x-auth');
    const provider = req.header('x-provider');
    let user;

    try {
        user = await User.findByTokenVerification(req, token, provider);
    } catch (error) {
        logger.error(`authenticate(req, res, next)`, `token verification failed`, { params: { error }});
        res.status(401).send(new Error(ERROR.TOKEN_VERIFICATION_ERROR.kind));
    }

    try {
        if (!user) {
            logger.warn(`authenticate(req, res, next)`, `cant find user`, { params: { token, provider }});
            throw new Error('cant find user');
        }
        req.user = user;
        req.token = token;

        logger.info(`authenticate(req, res, next)`, `Exit`, { params: { user }});
        next();

    } catch (e) {
        // if the token expired - remove it from the user tokens and sending the relevent error
        // if (e.message === 'jwt expired') {
        //     // await user.removeToken(token);
        //     logger.error(`authenticate(req, res, next)`, `jwt expired`, { params: { error: e}});
        //     res.status(401).send({ jwtExpError: e });
        // } else {
            logger.error(`authenticate(req, res, next)`, ``, { params: { error: e}});
            res.status(401).send(e);
        // }
    }
};

const authenticateAdmin = async (req, res, next) => {
    const token = req.header('x-auth');
    const provider = req.header('x-provider');

    try {
        const user = await User.findByTokenVerification(req, token, provider);

        if (!user || user.authData.roll !== 2) {
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