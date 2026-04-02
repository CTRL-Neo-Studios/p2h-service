/**
 * POST /api/convert/pages
 *
 * Processes an uploaded PDF page by page, returning an array of HTML or text strings.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Query params:
 *   - text=true  — return plain text per page instead of HTML
 *
 * Response:
 *   { success: true, data: { pages: string[], mode: 'html' | 'text' } }
 */
export default defineEventHandler(async (event) => {
	const buffer = await readPdfUpload(event);
	const query = getQuery(event);
	const textMode = query.text === "true" || query.text === "1";

	try {
		const pages = await pdfToPages(buffer, { text: textMode });
		return successResponse({ pages, mode: textMode ? "text" : "html" });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Page extraction failed";
		return errorResponse(message, 500, event);
	}
});
