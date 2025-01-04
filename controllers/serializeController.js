import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import moment from 'moment';
import serializeSchema from "../models/serializeModel.js";
import csvToJson from "../services/csvToJson.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import userSchema from '../models/userModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Ensure necessary folders exist or create them if they don't
const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// Multer setup: Define storage and file naming strategy
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

const upload = multer({ storage: storage });

const expectedHeaders = [
    "Serial No.", "LITHO", "BOOKLET SERIES", "SUBJECT", "ROLL NO",
    "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10",
    "Q11", "Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18", "Q19",
    "Q20", "Q21", "Q22", "Q23", "Q24", "Q25", "Q26", "Q27", "Q28",
    "Q29", "Q30", "Q31", "Q32", "Q33", "Q34", "Q35", "Q36", "Q37",
    "Q38", "Q39", "Q40", "Q41", "Q42", "Q43", "Q44", "Q45", "Q46",
    "Q47", "Q48", "Q49", "Q50", "Q51", "Q52", "Q53", "Q54", "Q55",
    "Q56", "Q57", "Q58", "Q59", "Q60", "Q61", "Q62", "Q63", "Q64",
    "Q65", "Q66", "Q67", "Q68", "Q69", "Q70", "Q71", "Q72", "Q73",
    "Q74", "Q75", "Q76", "Q77", "Q78", "Q79", "Q80", "Q81", "Q82",
    "Q83", "Q84", "Q85", "Q86", "Q87", "Q88", "Q89", "Q90", "Q91",
    "Q92", "Q93", "Q94", "Q95", "Q96", "Q97", "Q98", "Q99", "Q100",
    "Q101", "Q102", "Q103", "Q104", "Q105", "Q106", "Q107", "Q108",
    "Q109", "Q110", "Q111", "Q112", "Q113", "Q114", "Q115", "Q116",
    "Q117", "Q118", "Q119", "Q120", "Q121", "Q122", "Q123", "Q124",
    "Q125", "Q126", "Q127", "Q128", "Q129", "Q130", "Q131", "Q132",
    "Q133", "Q134", "Q135", "Q136", "Q137", "Q138", "Q139", "Q140",
    "Q141", "Q142", "Q143", "Q144", "Q145", "Q146", "Q147", "Q148",
    "Q149", "Q150", "Q151", "Q152", "Q153", "Q154", "Q155", "Q156",
    "Q157", "Q158", "Q159", "Q160", "SKEW1", "SKEW2", "SKEW3", "SKEW4"
];
// Validate the headers of the uploaded CSV
const validateCsvHeaders = async (filePath) => {
    return new Promise((resolve, reject) => {
        const headers = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headerRow) => {
                headers.push(...headerRow);
                const isValid = expectedHeaders.every((header, index) => header === headers[index]);
                resolve(isValid);
            })
            .on('error', (error) => reject(error));
    });
};

const uploadAndGenerateData = async (req, res) => {
    const file = req.file;
    const userId = req.userId;

    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await userSchema.findOne({ where: { id: userId } });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const reportDir = path.join(rootDir, 'completedSerializedReport');
    ensureFolderExists(reportDir);

    try {
        // Validate the headers of the uploaded CSV
        const isValidCsv = await validateCsvHeaders(file.path);
        if (!isValidCsv) {
            fs.unlinkSync(file.path); // Delete invalid file
            return res.status(400).json({ message: "Invalid CSV headers. Please ensure the file matches the required format." });
        }

        // Create a subdirectory for the report
        const fileNameWithoutExt = path.basename(file.filename, path.extname(file.filename));
        const reportSubDir = path.join(reportDir, fileNameWithoutExt);
        ensureFolderExists(reportSubDir);

        const reportTextFile = path.join(reportSubDir, `${fileNameWithoutExt}.txt`);
        const reportCsvFile = path.join(reportSubDir, file.filename); // Destination for the CSV file

        // Copy the uploaded CSV to the report subdirectory
        fs.copyFileSync(file.path, reportCsvFile);

        // Convert the uploaded CSV to JSON and generate the report
        const jsonData = await csvToJson(file.path);
        const csvLength = jsonData.length;

        const [minValue, maxValue] = file.filename.split('-').map(Number);

        // Initialize the report content
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        let reportContent = `File Name: ${minValue + "-" + maxValue}\nDate: ${now}\nTotal Number of Data: ${csvLength}\nUser: ${user.email}\n\n`;

        // Sheet presence check
        if (csvLength === 5000) {
            reportContent += `Sheet Present:5000 => OK\n\n`;
        } else {
            const discrepancy = Math.abs(5000 - csvLength);
            reportContent += `Sheet Present: ${csvLength} => NOT OK (${discrepancy} missing)\n\n`;

            const lithoCode = jsonData.map(row => Number(row["LITHO"]));
            const serialNumbers = jsonData.map(row => Number(row["Serial No."]));
            const expectedSerials = Array.from({ length: 5000 }, (_, index) => index + minValue);

            let missingLithos = [];
            let missingSerials = [];

            for (let i = 0; i < expectedSerials.length; i++) {
                if (!lithoCode.includes(expectedSerials[i])) {
                    missingLithos.push(expectedSerials[i]);
                    missingSerials.push(serialNumbers[i]);
                }
            }

            // Report missing data (Serial No, LITHO)
            if (missingSerials.length > 0) {
                reportContent += `Missing Data (Serial No, LITHO):\nSerial No,  LITHO\n`;

                for (let i = 0; i < missingSerials.length; i++) {
                    reportContent += `${missingSerials[i]} \t${missingLithos[i]}\n`;
                }
            }

            reportContent += '\n';
        }

        // Duplicate Litho Code check
        const lithoCounts = {};
        jsonData.forEach(row => {
            if (row["LITHO"]) {
                lithoCounts[row["LITHO"]] = (lithoCounts[row["LITHO"]] || 0) + 1;
            }
        });

        const duplicates = Object.entries(lithoCounts).filter(([key, count]) => count > 1);
        if (duplicates.length > 0) {
            reportContent += `Duplicate Litho Code: FOUND (${duplicates.length})\nSerial No, LITHO\n`;
            duplicates.forEach(([litho, count]) => {
                const duplicateRows = jsonData.filter(row => row["LITHO"] === litho);
                duplicateRows.forEach(row => {
                    reportContent += `${row["Serial No."]} - ${row["LITHO"]}\n`;
                });
            });
            reportContent += '\n';
        } else {
            reportContent += `Duplicate Litho Code: NONE (0)\n\n`;
        }

        // Not in Range Check
        const outOfRangeData = jsonData.filter(row => {
            const lithoValue = Number(row["LITHO"]);
            return lithoValue < minValue || lithoValue > maxValue;
        });

        if (outOfRangeData.length > 0) {
            reportContent += `Not in Range: YES\nSerial No, LITHO\n`;
            outOfRangeData.forEach(row => {
                reportContent += `${row["Serial No."]} \t${row["LITHO"]}\n`;
            });
        } else {
            reportContent += `Not in Range: NONE\n\n`;
        }

        // Extract cell values row-wise (excluding Serial No. and LITHO)
        reportContent += `\nRow-wise Non-Empty Data:\nSerial No. Litho -> [[CellName: Value], [CellName: Value]]\n`;
        jsonData.forEach(row => {
            const serialNo = row["Serial No."];
            const litho = row["LITHO"];
            const nonEmptyCells = Object.entries(row)
                .filter(([key, value]) => key !== "Serial No." && key !== "LITHO" && value && value.trim() !== '')
                .map(([key, value]) => `[${key}: ${value}]`);

            if (nonEmptyCells.length > 0) {
                reportContent += `${serialNo} ${litho} -> [${nonEmptyCells.join(", ")}]\n`;
            }
        });

        // Save the report as a .txt file
        fs.writeFileSync(reportTextFile, reportContent);

        // Save folder information to the database
        await serializeSchema.create({ userId, folderPath: fileNameWithoutExt });

        // Send the generated .txt file to the frontend for download
        return res.download(reportTextFile, `${fileNameWithoutExt}.txt`, (err) => {
            if (err) {
                console.error("Error sending the file:", err.message);
                return res.status(500).json({ message: "Failed to send the report file", error: err.message });
            }
        });
    } catch (error) {
        console.error("Error handling uploaded CSV:", error.message);
        return res.status(500).json({ message: "Failed to upload and process the CSV", error: error.message });
    }
};

// Fetch all serialized data
const getAllSerialize = async (req, res) => {
    try {
        const serializes = await serializeSchema.findAll();
        return res.status(200).json(serializes);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch serializes", error: error.message });
    }
};

export { uploadAndGenerateData, getAllSerialize, upload };
