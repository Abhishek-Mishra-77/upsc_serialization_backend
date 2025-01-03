import database from "../utils/database.js";
import { Sequelize } from "sequelize";

const serializeSchema = database.define('serialize', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    folderPath: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

export default serializeSchema;