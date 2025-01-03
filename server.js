import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const app = express();
import database from "./utils/database.js";

import userRoutes from './routes/userRoutes.js'

/* -------------------------------------------------------------------------- */
/*                           SERVER CONFIGURATION                             */
/* -------------------------------------------------------------------------- */

dotenv.config();
app.use(cors());
app.use(express.json());


/* -------------------------------------------------------------------------- */
/*                           ROUTES ORIGIN                                    */
/* -------------------------------------------------------------------------- */

app.use('/api/users', userRoutes)


database.sync({ force: false })
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT} and database synced`);
        })
    })

