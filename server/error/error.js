
const USER_VERIFICATION_ERROR = {
    code: 1,
    kind: 'user_verification_error'
};
const TOKEN_VERIFICATION_ERROR = {
    code: 2,
    kind: 'token_verification_error'
};


// encapsulate all error type in one object
const ERROR = {
    USER_VERIFICATION_ERROR,
    TOKEN_VERIFICATION_ERROR
}

module.exports = {
    ERROR
}