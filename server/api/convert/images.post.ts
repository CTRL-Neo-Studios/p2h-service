import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const MIME_MAP: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	bmp: "image/bmp",
	tiff: "image/tiff",
	webp: "image/webp",
};

/**
 * POST /api/convert/images
 *
 * Extracts all embedded images from an uploaded PDF and returns them as base64 strings.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Response:
 *   { success: true, data: { images: Array<{ data: string (base64), mimeType: string }> } }
 */
export default defineEventHandler(async (event) => {
	const buffer = await readPdfUpload(event);

	try {
		const imagePaths = await pdfExtractImages(buffer);

		const images = await Promise.all(
			imagePaths.map(async (filePath: string) => {
				const imageBuffer = await readFile(filePath);
				const ext = extname(filePath).slice(1).toLowerCase();
				const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
				return { data: imageBuffer.toString("base64"), mimeType };
			}),
		);

		return successResponse({ images });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Image extraction failed";
		return errorResponse(message, 500, event);
	}
});
