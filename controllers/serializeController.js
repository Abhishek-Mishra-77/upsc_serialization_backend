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
import { Op } from 'sequelize';
import { PDFDocument, rgb } from 'pdf-lib';

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

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    let fileName1 = String(file.filename).trim();

    const fileNamePattern = /^\d+(-\d+)+(-\d+)*\.csv$/;

    // Check if the file name matches the pattern
    if (!fileNamePattern.test(fileName1)) {
        return res.status(400).json({ message: "Invalid file name format. The file name should be in the format 'number-number-...-number.csv'." });
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

        const reportPdfFile = path.join(reportSubDir, `${fileNameWithoutExt}.pdf`);

        // Copy the uploaded CSV to the report subdirectory
        fs.copyFileSync(file.path, path.join(reportSubDir, file.filename));

        // Convert the uploaded CSV to JSON and generate the report
        const jsonData = await csvToJson(file.path);
        const csvLength = jsonData.length;

        const [minValue, maxValue] = file.filename.split('-').map(Number);

        // Initialize PDF Document
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([600, 800]);

        // Embed a built-in font (instead of Helvetica, use the default built-in font)
        const font = await pdfDoc.embedStandardFont('Helvetica');
        const fontSize = 12;
        const margin = 20;
        let yPosition = 780; // Starting Y position for text

        let pageCount = 1; // Track the total number of pages in the PDF

        // Helper function to add text to the PDF, with page overflow handling
        const addText = (text) => {
            // Replace tabs with spaces (e.g., 4 spaces per tab)
            const formattedText = text.replace(/\t/g, '    ');

            // Split text by newlines
            const lines = formattedText.split('\n');
            const lineHeight = fontSize + 2; // Line height for the text

            // Check if each line can fit within the current page, if not, create a new page
            lines.forEach(line => {
                const textWidth = font.widthOfTextAtSize(line, fontSize);
                const pageWidth = page.getWidth();
                const maxWidth = pageWidth - margin * 2;

                // If the text is too long, split it into multiple lines (basic word wrapping)
                while (textWidth > maxWidth) {
                    const breakPoint = line.lastIndexOf(' ', maxWidth / fontSize);  // Find where to break the line
                    const firstLine = line.substring(0, breakPoint);
                    const remainingLine = line.substring(breakPoint + 1);

                    page.drawText(firstLine, {
                        x: margin,
                        y: yPosition,
                        size: fontSize,
                        font,
                        color: rgb(0, 0, 0),
                    });
                    yPosition -= lineHeight;

                    line = remainingLine; // Use the remaining part of the line
                }

                // Draw the remaining line
                if (yPosition - lineHeight < 20) {
                    page = pdfDoc.addPage([600, 800]); // Add a new page if we reach the bottom
                    yPosition = 780; // Reset Y position
                    pageCount += 1; // Increment page count
                }

                page.drawText(line, {
                    x: margin,
                    y: yPosition,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                });

                yPosition -= lineHeight;  // Move to the next line
            });
        };

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

        // Extract cell values row-wise (excluding Serial No. and LITHO, and "SKEW1", "SKEW2", "SKEW3", "SKEW4")
        reportContent += `\nData in question:\nSerial No. Litho -> CellName: Value, CellName: Value\n`;
        jsonData.forEach(row => {
            const serialNo = row["Serial No."];
            const litho = row["LITHO"];
            const nonEmptyCells = Object.entries(row)
                .filter(([key, value]) =>
                    key !== "Serial No." &&
                    key !== "LITHO" &&
                    value && value.trim() !== '' &&
                    !["SKEW1", "SKEW2", "SKEW3", "SKEW4"].includes(key)
                )
                .map(([key, value]) => `${key}: ${value}`);

            if (nonEmptyCells.length > 0) {
                reportContent += `${serialNo} ${litho} -> ${nonEmptyCells.join(", ")}\n`;
            }
        });

        // Add the report content to the PDF document
        addText(reportContent);

        // Add page numbering at the bottom of the page
        const totalPages1 = pdfDoc.getPages().length;
        pdfDoc.getPages().forEach((page, idx) => {
            page.drawText(`(${idx + 1}/${totalPages1})`, {
                x: page.getWidth() - 50,
                y: 10,
                size: 10,
                font,
                color: rgb(0, 0, 0),
            });
        });

        // Save the PDF to a file
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(reportPdfFile, pdfBytes);

        // Save folder information to the database
        await serializeSchema.create({ userId, folderPath: fileNameWithoutExt });
        // Add Access-Control-Expose-Headers to expose the Content-Disposition header
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Custom-Header');
        // Send the generated .pdf file as a download to the frontend
        res.download(reportPdfFile, `${fileNameWithoutExt}.pdf`, (err) => {
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

const getAllSerializeByUserId = async (req, res) => {
    const { userId, role } = req;

    try {
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        if (!role) {
            return res.status(400).json({ message: "Role is required" });
        }

        let serializes;

        if (role === 'admin') {
            // Fetch all serializes with user details for admin
            serializes = await serializeSchema.findAll({
                include: [
                    {
                        model: userSchema,
                        attributes: ['email'],
                    },
                ],
            });
        } else {
            // Fetch serializes only for the specific user
            serializes = await serializeSchema.findAll({
                where: { userId },
                include: [
                    {
                        model: userSchema,
                        attributes: ['email'],
                    },
                ],
            });
        }


        return res.status(200).json(serializes);
    } catch (error) {
        console.error("Error fetching serializes:", error);
        return res.status(500).json({
            message: "Failed to fetch serializes",
            error: error.message,
        });
    }
};

const downloadTextReportById = async (req, res) => {
    const { serializeId, fileType } = req.query;

    try {
        // Validate input parameters
        if (!serializeId) {
            return res.status(400).json({ message: "Serialize ID is required" });
        }

        if (!fileType || !['pdf', 'csv'].includes(fileType)) {
            return res.status(400).json({ message: "Invalid file type. Allowed values are 'pdf' or 'csv'." });
        }

        // Fetch the serialize entry by ID
        const serialize = await serializeSchema.findOne({ where: { id: serializeId } });
        if (!serialize) {
            return res.status(404).json({ message: "Serialize not found" });
        }

        // Construct the file path
        const folderPath = serialize.folderPath;
        const fileExtension = fileType === 'pdf' ? 'pdf' : 'csv';
        const reportFilePath = path.join(__dirname, `../completedSerializedReport/${folderPath}/${folderPath}.${fileExtension}`);

        // Check if the file exists
        if (!fs.existsSync(reportFilePath)) {
            return res.status(404).json({ message: `${fileType.toUpperCase()} report file not found` });
        }

        // Set the appropriate Content-Type and headers for download
        if (fileType === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${folderPath}.pdf"`);
        } else if (fileType === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${folderPath}.csv"`);
        }

        // Add Access-Control-Expose-Headers to expose the Content-Disposition header
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Custom-Header');

        // Read the file as a stream (blob)
        const fileStream = fs.createReadStream(reportFilePath);

        // Pipe the file stream to the response (this will download the file)
        fileStream.pipe(res);

        // Error handling if there's an issue streaming the file
        fileStream.on('error', (err) => {
            console.error("Error sending file:", err.message);
            res.status(500).json({ message: "Failed to send the report file", error: err.message });
        });
    } catch (error) {
        console.error("Error fetching or sending the report file:", error.message);
        res.status(500).json({ message: "Failed to download the report file", error: error.message });
    }
};

const onCheckFileAlreadyPresent = async (req, res) => {
    const { filename } = req.query;

    try {
        if (!filename) {
            return res.status(400).json({ message: "Filename is required" });
        }

        const filePrefix = filename.replace(/\.csv$/, '');

        const matchedFile = await serializeSchema.findOne({
            where: {
                folderPath: {
                    [Op.like]: `${filePrefix}-%`
                }
            }
        });

        console.log(matchedFile)

        if (matchedFile) {
            console.log("File already present");
            return res.status(200).json({ message: "File already present", isPresent: true });
        } else {
            return res.status(404).json({ message: "File not found in database", isPresent: false });
        }
    } catch (error) {
        console.error("Error checking file:", error.message);
        res.status(500).json({ message: "Error checking file presence", error: error.message });
    }
};

export { uploadAndGenerateData, getAllSerialize, upload, getAllSerializeByUserId, downloadTextReportById, onCheckFileAlreadyPresent };
