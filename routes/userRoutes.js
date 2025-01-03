import express from "express";
const router = express.Router();
import { createUser, getUserById, getAllUsers, updateUserDetails, removeUser, loginHandler } from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

router.post('/create', authMiddleware, createUser);
router.post('/login', loginHandler);
router.put('/update/:id', authMiddleware, updateUserDetails);
router.delete('/remove/:id', authMiddleware, removeUser);
router.get('/getall', authMiddleware, getAllUsers);
router.get('/get/:id', authMiddleware, getUserById);

export default router;