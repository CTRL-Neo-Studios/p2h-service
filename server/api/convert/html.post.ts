/**
 * POST /api/convert/html
 *
 * Converts an uploaded PDF to HTML.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Query params:
 *   - bodyOnly=true  — return only the inner HTML of <body> instead of the full document
 *
 * Response:
 *   { success: true, data: { html: string } }
 *
 *   Default: html is the full XHTML document produced by Apache Tika.
 *   bodyOnly: html is the extracted inner content of <body> — a fragment suitable
 *             for direct injection into an existing page.
 */
export default defineEventHandler(async (event) => {
	const buffer = await readPdfUpload(event);
	const query = getQuery(event);
	const bodyOnly = query.bodyOnly === "true" || query.bodyOnly === "1";

	try {
		const fullHtml = await pdfToHtml(buffer);

		if (bodyOnly) {
			// Extract the inner HTML of <body> using a regex.
			// Tika's output is well-structured XHTML so this is reliable.
			const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
			const html = match?.[1]?.trim() ?? fullHtml;
			return successResponse({ html, bodyOnly: true });
		}

		return successResponse({ html: fullHtml, bodyOnly: false });
	} catch (err) {
		const message = err instanceof Error ? err.message : "PDF conversion failed";
		return errorResponse(message, 500, event);
	}
});
