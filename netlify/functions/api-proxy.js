const fetch = require('node-fetch');

// This function acts as a secure proxy for all external AI API calls.
// It hides the GOOGLE_API_KEY (which is set as an Environment Variable in Netlify)
// from the public frontend.
exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // 1. Read the SECRET key from the Netlify environment variables
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Key not configured." }) };
    }

    try {
        // 2. Parse the payload sent from the front-end's JavaScript
        const { modelName, apiPayload } = JSON.parse(event.body);
        
        if (!modelName || !apiPayload) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing modelName or apiPayload." }) };
        }

        let endpoint;
        let finalPayload;

        // 3. Construct the correct API endpoint based on the requested model
        // Note: Gemini uses :generateContent, Imagen uses :predict
        if (modelName.startsWith('imagen')) {
            // Imagen models use the :predict endpoint
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${GOOGLE_API_KEY}`;
            finalPayload = apiPayload;
        } else if (modelName.startsWith('gemini')) {
            // Gemini models use the :generateContent endpoint
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`;
            finalPayload = apiPayload;
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: "Unsupported model specified." }) };
        }

        // 4. Forward the request to the Google API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });

        const data = await response.json();

        // 5. Send the result back to the front-end
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error in API Proxy.", details: error.message })
        };
    }
};
