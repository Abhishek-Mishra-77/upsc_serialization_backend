import userSchema from "../models/userModel.js";
import jwt from "jsonwebtoken"

/* -------------------------------------------------------------------------- */
/*                           AUTH MIDDLEWARE                                  */
/* -------------------------------------------------------------------------- */

const authMiddleware = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res
            .status(401)
            .json({ message: "Unauthorized - Token Not Provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await userSchema.findOne({
            where: { id: decoded.user.id, email: decoded.user.email, role: decoded.user.role },
        });
        if (!user) {
            return res.status(401).json({ message: "Unauthorized - Invalid User" });
        }
        req.user = user;
        req.role = user.role;
        req.userId = user.id;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }
};

export default authMiddleware;