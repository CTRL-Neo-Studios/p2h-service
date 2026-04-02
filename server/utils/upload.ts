import type { H3Event } from "h3";

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * Read the uploaded PDF from a multipart/form-data request.
 *
 * Validates:
 *  - A file field named "file" exists
 *  - The file is non-empty
 *  - The file starts with the PDF magic bytes (%PDF)
 *  - The file does not exceed MAX_FILE_SIZE (if set)
 *
 * Returns the file contents as a Buffer.
 */
export async function readPdfUpload(event: H3Event): Promise<Buffer> {
	const formData = await readMultipartFormData(event);

	if (!formData || formData.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: 'No multipart form data received. Upload a PDF as the "file" field.',
		});
	}

	const filePart = formData.find((part) => part.name === "file");

	if (!filePart || !filePart.data || filePart.data.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: 'Missing "file" field in form data.',
		});
	}

	// Check file size limit
	const maxFileSizeEnv = process.env.MAX_FILE_SIZE;
	if (maxFileSizeEnv) {
		const maxBytes = parseInt(maxFileSizeEnv, 10);
		if (!isNaN(maxBytes) && filePart.data.length > maxBytes) {
			throw createError({
				statusCode: 413,
				statusMessage: "Payload Too Large",
				message: `File exceeds the maximum allowed size of ${maxBytes} bytes.`,
			});
		}
	}

	// Validate PDF magic bytes
	const data = filePart.data;
	if (
		data.length < 4 ||
		data[0] !== PDF_MAGIC[0] ||
		data[1] !== PDF_MAGIC[1] ||
		data[2] !== PDF_MAGIC[2] ||
		data[3] !== PDF_MAGIC[3]
	) {
		throw createError({
			statusCode: 400,
			statusMessage: "Bad Request",
			message: "Uploaded file does not appear to be a valid PDF (invalid magic bytes).",
		});
	}

	// data is a Buffer (Uint8Array subclass); ensure it's a Node.js Buffer instance
	return Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
}
