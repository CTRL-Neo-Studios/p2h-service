/**
 * POST /api/convert/text
 *
 * Extracts plain text from an uploaded PDF.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Response:
 *   { success: true, data: { text: string } }
 */
export default defineEventHandler(async (event) => {
  const buffer = await readPdfUpload(event)

  try {
    const text = await pdfToText(buffer)
    return successResponse({ text })
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Text extraction failed'
    return errorResponse(message, 500, event)
  }
})
