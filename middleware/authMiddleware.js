const SECRET = process.env.SECRET;
const jwt = require("jsonwebtoken");

async function authMiddleware(req,res,next){
    try{
        const token = req.headers.token;
        const checkToken = await jwt.verify(token, SECRET);
        req.decodedToken = checkToken;
        next();
    }

    catch(err){
        res.status(500).json({
            msg: "err is" + err
        })
    }
}

module.exports = {authMiddleware};