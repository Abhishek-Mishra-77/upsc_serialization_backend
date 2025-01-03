import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const app = express();
import database from "./utils/database.js";
import initialUserCreation from "./services/initialUserCreation.js";

import userSchema from "./models/userModel.js";
import serializeSchema from "./models/serializeModel.js";

import userRoutes from './routes/userRoutes.js'
import serializeRoutes from "./routes/serializeRoutes.js";

/* -------------------------------------------------------------------------- */
/*                           SERVER CONFIGURATION                             */
/* -------------------------------------------------------------------------- */

dotenv.config();
app.use(cors());
app.use(express.json());


/* -------------------------------------------------------------------------- */
/*                           TABLE RELATION                                   */
/* -------------------------------------------------------------------------- */

userSchema.hasMany(serializeSchema, { foreignKey: 'userId', onDelete: 'CASCADE' });
serializeSchema.belongsTo(userSchema, { foreignKey: 'userId' });


/* -------------------------------------------------------------------------- */
/*                           ROUTES ORIGIN                                    */
/* -------------------------------------------------------------------------- */

app.use('/api/users', userRoutes)
app.use('/api/serializes', serializeRoutes)


const startServer = async () => {
    try {
        await database.sync({ force: false });
        await initialUserCreation();
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT} and database synced`);
        });
    } catch (error) {
        console.error("Error syncing the database or starting the server", error);
    }
};

startServer();