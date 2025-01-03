import { Sequelize } from "sequelize";
import database from "../utils/database.js";

const userSchema = database.define('User', {
    username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    role: {
        type: Sequelize.STRING,
        allowNull: false
    },
    isRestricted: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
})
export default userSchema;