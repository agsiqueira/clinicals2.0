require("dotenv").config();

const fs = require("fs");
const path = require("path");

const navigatorBaseUrl = process.env.NAVIGATOR_BASE || "https://api.ai.it.ufl.edu";
const navigatorApiKey = process.env.NAVIGATOR_API_KEY;
const navigatorImageModel = process.env.NAVIGATOR_IMAGE_MODEL;


if (!navigatorApiKey) {
    console.error("Missing NAVIGATOR_API_KEY in backend/.env");
    process.exit(1);
}

if (!navigatorImageModel) {
    console.error("Missing NAVIGATOR_IMAGE_MODEL in backend/.env");
    process.exit(1);
}

let imagePrompt;
try {
    imagePrompt = require(`../../cases/${caseId}.imagePrompt`);
} catch (e) {
    console.error(`Missing prompts: CLINICALS/cases/${caseId}.imagePrompt.js`);
    process.exit(1);
}

async function generatePatientImage() {
    const caseId = process.argv[2];

    if (!caseId) {
        console.error("Usage: node generatePatientImage.js <caseId>");
        process.exit(1);
    }

    console.log("Generating image with model:", navigatorImageModel);

    const apiResponse = await fetch(`${navigatorBaseUrl}/v1/images/generations`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${navigatorApiKey}`,
        },
        body: JSON.stringify({
        model: navigatorImageModel,
        prompt: imagePrompt,
        size: "1024x1024",
        response_format: "b64_json",
        }),
    });

    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
        console.error("Image generation failed:", responseText);
        process.exit(1);
    }

    let responseJson;
    try {
        responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
        console.error("Expected JSON but got:", responseText);
        process.exit(1);
    }

    const firstResult = responseJson?.data?.[0] || {};

    const outputFilePath = path.resolve(
        __dirname,
        `../../mobile/assets/patients/${caseId}.png`
    );
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

    // Try common base64 fields
    const base64Image =
        firstResult.b64_json ||
        null;

    if (base64Image) {
        fs.writeFileSync(outputFilePath, Buffer.from(base64Image, "base64"));
        console.log("Image saved:", outputFilePath);
        return;
    }

    // if no base64 image was returned -> img URL
    const imageUrl = firstResult.url || firstResult.image_url || null;
    if (imageUrl) {
        const imageDownloadResponse = await fetch(imageUrl);
        if (!imageDownloadResponse.ok) {
            console.error("Failed to download image from url:", imageUrl);
            process.exit(1);
        }
        // convert downloaded response into binary data -> stop
        const imageBytes = await imageDownloadResponse.arrayBuffer();
        fs.writeFileSync(outputFilePath, Buffer.from(imageBytes));
        console.log("Image path:", outputFilePath);
        return;
    }

    console.error("No image returned. Full response JSON:");
    console.error(JSON.stringify(responseJson, null, 2));
    process.exit(1);
}

generatePatientImage().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
