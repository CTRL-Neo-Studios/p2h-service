/**
 * POST /api/convert/html
 *
 * Converts an uploaded PDF to a full HTML string.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Response:
 *   { success: true, data: { html: string } }
 */
export default defineEventHandler(async (event) => {
  const buffer = await readPdfUpload(event)

  try {
    const html = await pdfToHtml(buffer)
    return successResponse({ html })
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'PDF conversion failed'
    return errorResponse(message, 500, event)
  }
})
