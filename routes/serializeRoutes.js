import express from "express";
const router = express.Router();

import { uploadAndGenerateData, upload } from "../controllers/serializeController.js";

router.post('/upload', upload.single('file'), uploadAndGenerateData);


export default router;