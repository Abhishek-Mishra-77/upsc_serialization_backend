import serializeSchema from "../models/serializeModel.js";

const uploadAndGenerateData = async (req, res) => {
    const { userId, folderPath } = req.body;

    try {
        const serialize = await serializeSchema.create({ userId, folderPath });

        return res.status(200).json({ message: "Data uploaded and generated successfully", serialize });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to upload and generate data", error: error.message });
    }

}

const getAllSerialize = async (req, res) => {
    try {
        const serializes = await serializeSchema.findAll();
        return res.status(200).json(serializes);
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch serializes", error: error.message });
    }
}

export { uploadAndGenerateData, getAllSerialize }
