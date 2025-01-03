import express from "express";
const router = express.Router();

import { uploadAndGenerateData, getAllSerialize } from "../controllers/serializeController.js";

router.post('/upload', uploadAndGenerateData);
router.get('/getall', getAllSerialize);


export default router;