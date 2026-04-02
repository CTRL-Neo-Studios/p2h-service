/**
 * POST /api/convert/meta
 *
 * Extracts metadata from an uploaded PDF (title, author, creation date, etc.).
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Response:
 *   { success: true, data: { meta: object } }
 */
export default defineEventHandler(async (event) => {
	const buffer = await readPdfUpload(event);

	try {
		const meta = await pdfMeta(buffer);
		return successResponse({ meta });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Metadata extraction failed";
		return errorResponse(message, 500, event);
	}
});
