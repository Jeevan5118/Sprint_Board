import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

let cachedToken = null;
let tokenExpiry = null;

const getZohoBaseUrl = () => {
    const region = (process.env.ZOHO_REGION || 'com').toLowerCase();
    // Common regions: com, in, eu, au, jp
    return `https://accounts.zoho.${region}`;
};

export const getWorkDriveBaseUrl = () => {
    const region = (process.env.ZOHO_REGION || 'com').toLowerCase();
    return `https://workdrive.zoho.${region}/api/v1`;
};

/**
 * Automatically retrieves or refreshes the Zoho Access Token using the Refresh Token.
 * Implements caching to avoid redundant API calls.
 */
export const getZohoAccessToken = async () => {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    const isPlaceholder = (val) => !val || val.includes('your_') || val.startsWith('<');

    // Fallback if refresh credentials are missing or are placeholders
    if (isPlaceholder(clientId) || isPlaceholder(clientSecret) || isPlaceholder(refreshToken)) {
        console.warn('⚠️ Zoho OAuth credentials incomplete or placeholders. Using static ZOHO_WORKDRIVE_API_KEY.');
        return process.env.ZOHO_WORKDRIVE_API_KEY;
    }

    try {
        const baseUrl = getZohoBaseUrl();
        console.log(`🔄 Refreshing Zoho Access Token (${baseUrl})...`);
        const response = await axios.post(`${baseUrl}/oauth/v2/token`, null, {
            params: {
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token'
            }
        });

        const { access_token, expires_in } = response.data;

        if (!access_token) {
            throw new Error('No access_token returned from Zoho');
        }

        cachedToken = access_token;
        // Expire 2 minutes early to be safe
        tokenExpiry = Date.now() + (expires_in - 120) * 1000;

        console.log('✅ Zoho Access Token refreshed successfully.');
        return cachedToken;
    } catch (error) {
        console.error('❌ Failed to refresh Zoho Token:', error.response?.data || error.message);

        // Final fallback to static key if refresh fails
        return process.env.ZOHO_WORKDRIVE_API_KEY;
    }
};
