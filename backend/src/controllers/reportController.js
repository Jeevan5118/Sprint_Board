import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { getZohoAccessToken, getWorkDriveBaseUrl } from '../utils/zohoAuth.js';
dotenv.config();

/**
 * Common helper to find or create a user-named folder within a specific parent folder in Zoho
 */
const getOrCreateUserFolder = async (parentFolderId, userName, authHeader) => {
    try {
        const baseUrl = getWorkDriveBaseUrl();
        const listUrl = `${baseUrl}/files/${parentFolderId}/files`;
        const listResponse = await axios.get(listUrl, { headers: authHeader });

        const existingFolder = listResponse.data.data?.find(file =>
            file.attributes.name === userName && file.attributes.type === 'folder'
        );

        if (existingFolder) {
            return { id: existingFolder.id, isSubfolder: true };
        }

        const createUrl = `${baseUrl}/files`;
        const createResponse = await axios.post(createUrl, {
            data: {
                attributes: {
                    name: userName,
                    parent_id: parentFolderId
                },
                type: "files"
            }
        }, { headers: authHeader });

        return { id: createResponse.data.data.id, isSubfolder: true };
    } catch (error) {
        console.error(`Fallback: Subfolder logic failed for ${userName}:`, error.message);
        return { id: parentFolderId, isSubfolder: false };
    }
};

/**
 * Generic upload handler to relay files to a specific Zoho folder
 */
const handleZohoUpload = async (file, targetFolderId, apiKey, customName = null) => {
    const formData = new FormData();
    formData.append('content', file.buffer, {
        filename: customName || file.originalname,
        contentType: file.mimetype,
    });

    const baseUrl = getWorkDriveBaseUrl();
    const uploadUrl = `${baseUrl}/upload?parent_id=${targetFolderId}&override-name-exist=true`;

    return axios.post(uploadUrl, formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': `Zoho-oauthtoken ${apiKey}`
        },
    });
};

export const submitReport = async (req, res, next) => {
    try {
        console.log(`[SubmitReport] Headers:`, JSON.stringify(req.headers));
        console.log(`[SubmitReport] File:`, req.file ? 'Received' : 'MISSING');

        if (!req.file) return res.status(400).json({
            message: 'No report file provided',
            debug: { headers: req.headers['content-type'] }
        });

        const apiKey = await getZohoAccessToken();
        const rootFolderId = process.env.ZOHO_WORKDRIVE_REPORTS_FOLDER_ID;
        const userName = req.user.name || 'Unknown Member';

        console.log(`[SubmitReport] Config Check: apiKey exists? ${!!apiKey}, rootFolderId: "${rootFolderId}"`);

        if (!apiKey || !rootFolderId || rootFolderId.includes('your_reports_folder_id_here')) {
            return res.status(500).json({
                message: 'Zoho Reports storage is not configured',
                debug: { hasApiKey: !!apiKey, folderId: rootFolderId }
            });
        }

        const authHeader = { 'Authorization': `Zoho-oauthtoken ${apiKey}` };
        const { id: targetId, isSubfolder } = await getOrCreateUserFolder(rootFolderId, userName, authHeader);

        let finalName = req.file.originalname;
        if (!isSubfolder) {
            const dateStr = new Date().toISOString().split('T')[0];
            finalName = `${userName}_${dateStr}_${req.file.originalname}`;
        }

        const response = await handleZohoUpload(req.file, targetId, apiKey, finalName);

        res.status(200).json({
            message: isSubfolder ? `Report uploaded to folder: ${userName}` : `Report uploaded to root as: ${finalName}`,
            zohoResponse: response.data
        });
    } catch (error) {
        console.error('Zoho Report Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: 'Failed to upload report to Zoho',
            error: error.response?.data || error.message
        });
    }
};

export const uploadWork = async (req, res, next) => {
    try {
        console.log(`[UploadWork] Headers:`, JSON.stringify(req.headers));
        console.log(`[UploadWork] File:`, req.file ? 'Received' : 'MISSING');

        if (!req.file) return res.status(400).json({
            message: 'No work file provided',
            debug: { headers: req.headers['content-type'] }
        });

        const apiKey = await getZohoAccessToken();
        const rootFolderId = process.env.ZOHO_WORKDRIVE_WORK_FOLDER_ID;
        const userName = req.user.name || 'Unknown Member';

        if (!apiKey || !rootFolderId) {
            return res.status(500).json({ message: 'Zoho Work storage is not configured' });
        }

        const authHeader = { 'Authorization': `Zoho-oauthtoken ${apiKey}` };
        const { id: targetId, isSubfolder } = await getOrCreateUserFolder(rootFolderId, userName, authHeader);

        let finalName = req.file.originalname;
        if (!isSubfolder) {
            const dateStr = new Date().toISOString().split('T')[0];
            finalName = `${userName}_${dateStr}_${req.file.originalname}`;
        }

        const response = await handleZohoUpload(req.file, targetId, apiKey, finalName);

        res.status(200).json({
            message: isSubfolder ? `Work uploaded to folder: ${userName}` : `Work uploaded to root as: ${finalName}`,
            zohoResponse: response.data
        });
    } catch (error) {
        console.error('Zoho Work Upload Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: 'Failed to upload work to Zoho',
            error: error.response?.data || error.message
        });
    }
};
