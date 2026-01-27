import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

export async function downloadToTemp(url: string): Promise<string> {
    // Generate filename from URL hash to allow caching
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = path.extname(new URL(url).pathname) || ".png";
    const tempDir = os.tmpdir();
    const filename = `raycast-gen-${hash}${ext}`;
    const filePath = path.join(tempDir, filename);

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
            return filePath;
        }
        // If file exists but is empty, delete it and re-download
        fs.unlinkSync(filePath);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/") && !contentType.startsWith("video/")) {
        throw new Error(`Invalid content type: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
}
