import fs from 'fs';
import path from 'path';

const removeCsvFiles = async (folderPath) => {
    try {
        if (!fs.existsSync(folderPath)) {
            return;
        }

        const files = await fs.promises.readdir(folderPath);
        const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv');

        if (csvFiles.length === 0) {
            return;
        }

        for (const file of csvFiles) {
            const filePath = path.join(folderPath, file);

            try {

                await fs.promises.chmod(filePath, 0o666);
                await fs.promises.unlink(filePath);
            } catch (err) {
                console.error(`Error removing file ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('Error reading the folder or removing files:', err);
    }
};

export default removeCsvFiles;