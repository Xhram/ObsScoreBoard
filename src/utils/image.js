export function image_to_data_url(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = "image/png";
    const base64 = imageBuffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
}