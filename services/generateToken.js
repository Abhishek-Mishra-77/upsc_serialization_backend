import jwt from "jsonwebtoken";

export const generateToken = (user) => {
    return jwt.sign({ user }, process.env.SECRET_KEY, { expiresIn: "72h" });
}