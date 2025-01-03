import userSchema from "../models/userModel.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const createUser = async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const salt = await bcrypt.getSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new userSchema({
            username,
            email,
            password: hashedPassword,
            role,
            isRestricted: false
        });

        await user.save();
        return res.status(201).json({ message: "User created successfully" })
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to create user", error: error.message });
    }

};
const getUserById = async (req, res) => { };
const getAllUsers = async (req, res) => { };
const updateUserDetails = async (req, res) => { };
const removeUser = async (req, res) => { };
const userRestriction = async (req, res) => { };

export { createUser, getUserById, getAllUsers, updateUserDetails, removeUser, userRestriction };