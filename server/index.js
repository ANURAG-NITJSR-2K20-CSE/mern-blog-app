const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose"); // jitna awsyakta hai ootna hi lo
require("dotenv").config();
const upload = require("express-fileupload");

const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// we should initialize the express
const app = express();

// setup middleware
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "http://localhost:3000" })); // url of frontend or postman when we are intesting phase

// setup the express uploads middleware
app.use(upload()); // yaha par error aaega agar sahi se bracket nahi lagaoge.
// and also setup the route
app.use("/uploads", express.static(__dirname + "/uploads"));

// now let setup route
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
// when any route does not match then go to error route.
app.use(notFound);
app.use(errorHandler);

connect(process.env.MONGO_URI)
  .then(
    app.listen(process.env.PORT || 5000, () => {
      console.log(`server running on port ${process.env.PORT}`);
    })
  )
  .catch((error) => console.log(error.message));
