import express from "express";
const router = express.Router();

import { uploadAndGenerateData, upload, getAllSerializeByUserId, downloadTextReportById, onCheckFileAlreadyPresent } from "../controllers/serializeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

router.post('/upload', authMiddleware, upload.single('file'), uploadAndGenerateData);
router.get('/check', authMiddleware, onCheckFileAlreadyPresent);
router.get('/getall/serialize', authMiddleware, getAllSerializeByUserId);
router.get('/download/textreport', authMiddleware, downloadTextReportById);

export default router;