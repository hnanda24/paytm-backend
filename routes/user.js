const express = require("express");
const zod = require("zod");
const bcrypt = require("bcrypt");
const router = express.Router();
const {User} = require("../models/db");
const {Account} = require("../models/db");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/authMiddleware");
const mongoose = require("mongoose")
const SECRET = process.env.SECRET;


const signupSchema = zod.object({
    username: zod.string(),
    password: zod.string().min(4),
    firstName: zod.string(),
    lastName: zod.string(),
    email: zod.string().email({message: "Invalid Email Id"})
})

const loginSchema = zod.object({
    email: zod.string().email(),
    password: zod.string()
})

const updateDataSchema = zod.object({
    password: zod.string().min(4).optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
})

router.post("/signup", async(req,res) => {
    try{
        const body = req.body;
        // console.log(body)
        const {success} = signupSchema.safeParse(req.body);
        if(!success){
            return res.json({
                msg: "Incorrect inputs"
            })
        }

        const hashedPassword = await bcrypt.hash(body.password,10);
        // console.log(hashedPassword)
        const userData = {
            ...body,
            password: hashedPassword
        }
        
        // console.log(userData)
        const dbUser = await User.create(userData);
        // await dbUser.save()

        // console.log(dbUser)
        await Account.create({
            userId: dbUser._id,
            balance: 0
        })

        res.status(201).json({
            msg: "User Signup success"
        })
    }
    catch(err){
        res.status(500).json({
            msg: "Internal Server error",
            err: err.message
        })
    }
})

router.post("/login", async(req,res) => {
    try{
        const body = req.body;
        const {success} = loginSchema.safeParse(req.body);
        // console.log(SECRET)

        if(!success){
            return res.json({
                msg: "Wrong email or password"
            })
        }

        const validUser = await User.findOne({
            email: body.email
        })

        if(!validUser){
            return res.json({
                msg: "Invalid User"
            })
        }

        const passCheck = await bcrypt.compare(body.password, validUser.password);
        if(!passCheck){
            return res.json({
                msg: "Wrong password"
            })
        }

        var token = jwt.sign({email: validUser.email}, SECRET)
        // console.log(token)
        return res.json({
            "userId" : validUser._id,
            token,
            message: "Logged in"
        })
    }

    catch(err){
        res.status(500).json({
            msg: "error is: " + err
        })
    }
})

router.get('/displayUser',authMiddleware, async(req,res) => {
    try{
        const loggedInUser = await User.findOne({
            email: req.decodedToken.email
        })

        if(!loggedInUser){
            return(
                res.status(404).json({
                    msg: "User not found"
                }))
        }

        res.status(201).json(loggedInUser)
    }

    catch(err){
        return
            res.status(500).json({
                msg: err.message
            })
    }
})

router.put('/update',authMiddleware, async(req,res) => {
    try{
        const userToUpdate = await User.findOne({
            email: req.decodedToken.email
        })
        // console.log(userToUpdate)
        const updates = req.body;
        // console.log(updates)
        const id = userToUpdate._id;
        // console.log(id)

        const validated = updateDataSchema.safeParse(updates);
        if(!validated.success){
            // console.log(validated.error)
            return res.json({
                msg: "Wrong Inputs"
            })
        }

        if(updates.password)
        {
            updates.password = await bcrypt.hash(updates.password,10);
        }

        const updatedUser = await User.findByIdAndUpdate(id, updates);

        if(!updatedUser)
        {
            return res.status(404).json({
                msg: "User not found"
            })
        }

        return res.status(200).json({
            msg: "User updated"
        })
    }

    catch(err){
        res.status(500).json({
            msg: "Internal server error",
            error: err.message
        })
    }
   
})

router.get("/search", async(req,res) => {
    //doubt 
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{
            firstName:{
                $regex : filter, 
                $options: "i"
            }
        },{
            lastName: {
                "$regex": filter,
                $options: "i" 
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })

})

module.exports = router;