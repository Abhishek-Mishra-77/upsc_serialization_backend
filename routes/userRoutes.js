import express from "express";
const router = express.Router();
import { createUser, getUserById, getAllUsers, updateUserDetails, removeUser, userRestriction } from "../controllers/userController.js";

router.post('/create', createUser);
router.put('/update/:id', updateUserDetails);
router.put('/restrict/:id', userRestriction);
router.delete('/remove/:id', removeUser);
router.get('/getall', getAllUsers);
router.get('/get/:id', getUserById);

export default router;