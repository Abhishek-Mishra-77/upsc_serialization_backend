import fs from 'fs';
import csv from 'csv-parser';


export const expectedHeaders = [
    "Serial No.", "LITHO", "BKN", "BOOKLET SERIES", "SUBJECT", "ROLL NO",
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
export const validateCsvHeaders = async (filePath) => {
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

export const ensureFolderExists = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};