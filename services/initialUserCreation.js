import userSchema from "../models/userModel.js";
import bcrypt from "bcryptjs";

const initialUserCreation = async () => {
    try {
        const adminUser = await userSchema.findOne({ where: { role: "admin" } });

        const hashedPassword = await bcrypt.hash("12345678", 10);

        if (!adminUser) {
            await userSchema.create({
                username: "admin",
                email: "admin@gmail.com",
                password: hashedPassword,
                role: "admin",
                isRestricted: false
            });
            console.log("Admin user created successfully!");
        } else {
            console.log("Admin user already exists.");
        }
    } catch (error) {
        console.error("Error creating initial user:", error);
    }
};

export default initialUserCreation;
