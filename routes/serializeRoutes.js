import express from "express";
const router = express.Router();

import { uploadAndGenerateData, getAllSerializeByUserId, downloadTextReportById, onCheckFileAlreadyPresent } from "../controllers/serializeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/serializeFileUpload.js";

// router.post('/upload', upload.array('file', 10), uploadAndGenerateData);
router.post('/upload', authMiddleware, upload.single('file'), uploadAndGenerateData);
router.get('/check', authMiddleware, onCheckFileAlreadyPresent);
router.get('/getall/serialize', authMiddleware, getAllSerializeByUserId);
router.get('/download/textreport', authMiddleware, downloadTextReportById);

export default router;