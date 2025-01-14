import multer from "multer";
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ensureFolderExists } from "../services/csvValidation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(rootDir, 'uploadedCSVs');
        ensureFolderExists(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const fileExtension = path.extname(file.originalname);
        const fileNameWithoutExt = path.basename(file.originalname, fileExtension);
        const uniqueFileName = `${fileNameWithoutExt}-${timestamp}${fileExtension}`;
        cb(null, uniqueFileName);
    },
});

export const upload = multer({ storage: storage });