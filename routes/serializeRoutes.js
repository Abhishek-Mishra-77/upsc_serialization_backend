import express from "express";
const router = express.Router();

import { uploadAndGenerateData, upload } from "../controllers/serializeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

router.post('/upload',authMiddleware ,  upload.single('file'), uploadAndGenerateData);


export default router;