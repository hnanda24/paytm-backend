const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { Account, User } = require("../models/db");
const router = express.Router();
const zod = require("zod");
const mongoose = require("mongoose");

const updateBalanceSchema = zod.object({
    accountId: zod.string(),
    balance: zod.number().min(0, "Balance must be a positive number"),
});

//check user's balance
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const accountHolder = await User.findOne({
            email: req.decodedToken.email
        })

        const account = await Account.findOne({
            userId: accountHolder._id
        });

        if (!account) {
            return res.status(404).json({
                msg: "Account not found",
            });
        }

        res.status(200).json({
            balance: account.balance,
        });
    } catch (err) {
        res.status(500).json({
            msg: "Internal Server Error",
            error: err.message,
        });
    }
});

// Transfer amount
router.post("/transfer",  async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { amount, to } = req.body;
        // console.log(req.body)

        const account = await Account.findOne({
            userId: req.body.userId,
        }).session(session);

        // console.log(account);

        if (!account || account.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({
                msg: "Insufficient balance",
            });
        }

        const toAccount = await Account.findOne({
            userId: to,
        }).session(session);

        if (!toAccount) {
            await session.abortTransaction();
            return res.status(400).json({
                msg: "Invalid Account",
            });
        }

        // Update balances
        await Account.updateOne(
            { userId: req.body.userId },
            { $inc: { balance: -amount } }
        ).session(session);

        await Account.updateOne(
            { userId: to },
            { $inc: { balance: amount } }
        ).session(session);

        await session.commitTransaction();
        res.status(200).json({
            msg: "Transfer Successful",
        });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({
            msg: "Internal Server Error",
            error: err.message,
        });
    } finally {
        session.endSession();
    }
});

// Add balance
router.post("/addBalance",async (req, res) => {
    try {
        const { accountId, balance } = req.body;

        const { success, error } = updateBalanceSchema.safeParse({ accountId, balance });
        if (!success) {
            return res.status(400).json({
                msg: "Invalid Inputs",
                error: error.errors,
            });
        }

        const userData = await Account.findOne({
            userId: accountId
        })
        userData.balance += balance;

        const updatedAccount = await Account.findOneAndUpdate(
            {userId: accountId},
            { balance: userData.balance},
            { new: true }
        );

        if (!updatedAccount) {
            return res.status(404).json({
                msg: "Account not found or not updated",
            });
        }

        res.status(200).json({
            msg: "Balance updated successfully",
            updatedAccount,
        });
    } catch (err) {
        res.status(500).json({
            msg: "Internal Server Error",
            error: err.message,
        });
    }
});

module.exports = router;
