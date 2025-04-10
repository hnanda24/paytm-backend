const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const mongoose = require("mongoose")
const cors = require("cors");
const mainRouter = require("./routes/index")
const MONGOURI = process.env.MONGO_URI;
const PORT = 3000

const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(MONGOURI)
.then(() => {console.log("DB Connected")})
.catch((err) => {console.log("Error connecting to DB" + err)})

app.use("/api/v1", mainRouter);

app.use("api/v1", mainRouter);

app.listen(PORT, () => {
    console.log("Server is running on port 3000");
})
