import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import moment from 'moment';
import serializeSchema from "../models/serializeModel.js";

// Fix for ES Modules to get __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the root directory (main project directory)
const rootDir = path.resolve(__dirname, '..'); // The parent directory of the current file

// Ensure necessary folders exist or create them if they don't
const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

// Function to clean up temporary files and folders with retry logic
const cleanUpTempFiles = async (tempFilePath, tempFolderPath, retries = 3, delay = 1000) => {
    try {
        if (fs.existsSync(tempFilePath)) {
            await fs.promises.unlink(tempFilePath); // Asynchronously delete the file
        }

        if (fs.existsSync(tempFolderPath)) {
            await fs.promises.rm(tempFolderPath, { recursive: true, force: true }); // Asynchronously delete the folder
        }
    } catch (error) {
        if (retries > 0) {
            console.log(`Error deleting files or folders, retrying in ${delay}ms...`);
            setTimeout(async () => {
                await cleanUpTempFiles(tempFilePath, tempFolderPath, retries - 1, delay);
            }, delay);
        } else {
            console.error('Failed to delete temporary files after multiple attempts:', error);
        }
    }
};

// Multer setup: Define storage and file naming strategy
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Initial upload location to the temp folder inside 'serializeTempFolder'
        const tempFolder = path.join(rootDir, 'serializeTempFolder', 'temp');
        ensureFolderExists(tempFolder); // Ensure the temp folder exists
        cb(null, tempFolder); // Set the destination folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Save with the original file name
    }
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

// Function to validate CSV headers
const validateCSVHeaders = (headers) => {
    // Compare headers from the CSV to the expected headers
    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
        return { valid: false, missingHeaders };
    }
    return { valid: true };
};

// Create error report file
const createErrorReport = (errorDetails, folderPath) => {
    const reportFileName = `report_${Date.now()}.txt`;
    const reportFilePath = path.join(folderPath, reportFileName);
    fs.writeFileSync(reportFilePath, errorDetails);
    return reportFilePath;
};

// Upload and process CSV data
const uploadAndGenerateData = async (req, res) => {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
        const errorReport = createErrorReport("No file uploaded", path.join(rootDir, 'serializeTempFolder'));
        return res.status(400).json({
            message: "No file uploaded",
            errorReportPath: errorReport,
        });
    }

    const tempFilePath = path.join(rootDir, 'serializeTempFolder', 'temp', file.originalname); // File in the temp folder

    try {
        const results = [];
        const report = [];
        const fileName = file.originalname;
        const minValue = fileName.split('-')[0];
        const maxValue = fileName.split('-')[1];
        const lithoRange = { min: minValue, max: maxValue };

        const lithoSet = new Set();
        const duplicates = [];
        const outOfRange = [];

        const csvStream = fs.createReadStream(tempFilePath)
            .pipe(csv())
            .on('headers', async (headers) => {
                // Validate the headers first
                const { valid, missingHeaders } = validateCSVHeaders(headers);
                if (!valid) {
                    // Generate error report for missing headers
                    const errorDetails = `Missing headers: ${missingHeaders.join(", ")}`;
                    return res.status(400).json({
                        message: "CSV file has missing or incorrect headers.",
                        missingHeaders,
                    });
                }
            })
            .on('data', (row) => {
                results.push(row);

                const litho = parseInt(row.LITHO, 10);
                const serialNo = row["Serial No."];

                // Check for duplicates
                if (lithoSet.has(litho)) {
                    duplicates.push(serialNo);
                } else {
                    lithoSet.add(litho);
                }

                // Check if the LITHO value is within the allowed range
                if (litho < lithoRange.min || litho > lithoRange.max) {
                    outOfRange.push({ serialNo, litho });
                }
            })
            .on('end', async () => {
                // Start creating the report
                const reportFileName = `${fileName.split('.')[0]}-${moment().valueOf()}.txt`;
                const reportFilePath = path.join(rootDir, 'serializeTempFolder', reportFileName);

                // File Information
                report.push(`File Name: ${fileName}`);
                report.push(`Processed by: ${userId}`);
                report.push(`Processed on: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
                report.push("\n");

                // Total Rows
                const totalRows = results.length;
                report.push(`Total no of data: ${totalRows === 5000 ? "OK" : "NOT OK"}`);
                if (totalRows !== 5000) {
                    const missingOrExtra = totalRows < 5000
                        ? `Total missing data: ${5000 - totalRows}`
                        : `Total extra data: ${totalRows - 5000}`;
                    report.push(missingOrExtra);

                    // Print missing or extra data (Serial No., LITHO)
                    const dataDiff = totalRows < 5000 ? "missing" : "extra";
                    report.push(`Missing or extra data (${dataDiff}):`);
                    results.forEach(row => {
                        report.push(`${row["Serial No."]}, ${row["LITHO"]}`);
                    });
                }
                report.push("\n");

                // Duplicates
                if (duplicates.length > 0) {
                    report.push(`Duplicate Lithocode Found (${duplicates.length}):`);
                    const duplicatesGrouped = groupDuplicates(duplicates);
                    duplicatesGrouped.forEach(group => {
                        report.push(group.join(' , '));
                    });
                } else {
                    report.push(`Duplicate Lithocode Found (0): None`);
                }
                report.push("\n");

                // Not in range
                if (outOfRange.length > 0) {
                    report.push(`Not in range (${outOfRange.length}):`);
                    outOfRange.forEach(item => {
                        report.push(`${item.serialNo}, ${item.litho}`);
                    });
                } else {
                    report.push("Not in range: NONE");
                }

                // Writing the report to the file
                fs.writeFileSync(reportFilePath, report.join('\n'));

                // Move the original CSV file into the new folder
                const folderBaseName = fileName.split('.')[0];
                const currentTime = moment().valueOf();
                const folderName = `${folderBaseName}-${currentTime}`;

                // Ensure the completed folder path is correct
                const completedFolderPath = path.resolve(rootDir, 'serializeTempFolder', folderName);
                console.log('Creating folder:', completedFolderPath);
                ensureFolderExists(completedFolderPath);

                const newFilePath = path.join(completedFolderPath, `${folderBaseName}-${currentTime}.csv`);
                fs.renameSync(tempFilePath, newFilePath);

                // Save the folder path in the database
                const folderPath = path.join('serializeTempFolder', folderName);
                const serialize = await serializeSchema.create({ userId, folderPath });

                return res.status(200).sendFile(reportFilePath);
            })
            .on('error', async (error) => {
                const errorReport = createErrorReport(`Failed to process the CSV file: ${error.message}`, path.join(rootDir, 'serializeTempFolder'));
                await cleanUpTempFiles(tempFilePath, path.dirname(tempFilePath));
                return res.status(500).sendFile(errorReport);
            });
    } catch (error) {
        const errorReport = createErrorReport(`Failed to upload and generate data: ${error.message}`, path.join(rootDir, 'serializeTempFolder'));
        await cleanUpTempFiles(tempFilePath, path.dirname(tempFilePath));
        return res.status(500).sendFile(errorReport);
    }
};

// Helper function to group duplicate litho values
const groupDuplicates = (duplicates) => {
    const grouped = [];
    const uniqueDuplicates = [...new Set(duplicates)];

    uniqueDuplicates.forEach(litho => {
        const indexes = duplicates.reduce((acc, value, index) => {
            if (value === litho) acc.push(index + 1); // 1-based index for user-friendly report
            return acc;
        }, []);
        grouped.push([...indexes, litho]);
    });

    return grouped;
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
