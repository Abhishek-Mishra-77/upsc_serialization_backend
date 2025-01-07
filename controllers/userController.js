import userSchema from "../models/userModel.js";
import bcrypt from "bcryptjs"
import { generateToken } from "../services/generateToken.js";
import serializeSchema from "../models/serializeModel.js";

const createUser = async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await userSchema.findOne({ where: { email } });


        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new userSchema({
            username,
            email,
            password: hashedPassword,
            role,
            isRestricted: false
        });

        await user.save();
        return res.status(201).json({ message: "User created successfully", isCreated: true })
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to create user", error: error.message });
    }

};

const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await userSchema.findOne({ where: { id: id }, attributes: { exclude: ['password'] } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);

    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch user", error: error.message });
    }

};

const getAllUsers = async (req, res) => {
    try {
        const users = await userSchema.findAll({ attributes: { exclude: ['password'] } });
        if (users.length === 0) {
            return res.status(200).json({ message: "No users found", users: [] });
        }

        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }
};

const updateUserDetails = async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password, isRestricted } = req.body;
    try {
        const user = await userSchema.findOne({ where: { id } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.email === process.env.ADMIN_EMAIL) {
            return res.status(400).json({ message: "Cannot update admin user" });
        }

        const updateData = {};
        if (username !== undefined) updateData.username = username;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;

        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        if (isRestricted !== undefined) {
            updateData.isRestricted = isRestricted;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        await userSchema.update(updateData, { where: { id } });
        return res.status(200).json({ message: "User details updated successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update user details", error: error.message });
    }
};

const removeUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await userSchema.findOne({ where: { id } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.email === process.env.ADMIN_EMAIL) {
            return res.status(400).json({ message: "Cannot delete admin user" });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await userSchema.destroy({ where: { id } });
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to delete user", error: error.message });
    }
};

const loginHandler = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userSchema.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isRestricted) {
            return res.status(401).json({ message: "User is restricted" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const userDetails = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        }

        const token = generateToken(user);
        return res.status(200).json({ message: "Login successful", token: token, user: userDetails });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to login", error: error.message });
    }
}

const getAnalytics = async (req, res) => {
    const { userId, role } = req;

    try {
        if (role !== 'admin') {
            return res.status(401).json({ message: "Only admin can access analytics" });
        }

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const allUsers = await userSchema.findAll({ attributes: ['id', 'username', 'email', 'role'] });
        const allActiveUsers = await userSchema.findAll({ where: { isRestricted: false }, attributes: ['id', 'username', 'email', 'role'] });
        const allUploadedFiles = await serializeSchema.findAll();

        const analyticsData = {
            users: allUsers.length,
            activeUsers: allActiveUsers.length,
            uploadedFiles: allUploadedFiles.length
        }

        return res.status(200).json({ analyticsData });

    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch analytics", error: error.message });
    }
}

export { createUser, getUserById, getAllUsers, updateUserDetails, removeUser, loginHandler, getAnalytics };