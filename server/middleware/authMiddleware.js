const jwt = require('jsonwebtoken')
const HttpError = require('../models/errorModel')

const authMiddleware = async (req, res, next) => {
    // first get a token from the request which coming in
    const Authorization = req.headers.Authorization || req.headers.authorization;

    // we are going to make sure that the authorization exist and also start with "Bearer" if so then go ahead and extract that token from the headers

    if(Authorization && Authorization.startsWith('Bearer')) {
        // extract that token
        const token = Authorization.split(' ')[1] // we are going to do by the help of split 
        // "Bearer  4a23FADFAFA34234" that why we are using the space while splitting
        //and [1]means 2nd index where the token is present


        //once we have the token then we verify that the token using the jwt
        jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
            if(err) {
                return next(new HttpError("Unauthorized, Invalid token.", 422))
            }
            // if there is no error then
            req.user = info; // it pass the info which is made as payload while generating the token
            // once all fine then go to next middle ware
            next()
        });
    } else {
        return next(new HttpError("Unauthorized, Invalid token.", 422))
    }

}

module.exports = authMiddleware;