import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

/**
 * POST /api/convert/thumbnail
 *
 * Generates a thumbnail image for one page of an uploaded PDF.
 *
 * Request: multipart/form-data
 *   - file: the PDF file
 *
 * Query params:
 *   - page       — page number to thumbnail (default: 1)
 *   - imageType  — 'png' or 'jpg' (default: 'png')
 *   - width      — width in pixels (default: 160)
 *   - height     — height in pixels (default: 226)
 *
 * Response:
 *   { success: true, data: { image: string (base64), mimeType: string } }
 */
export default defineEventHandler(async (event) => {
  const buffer = await readPdfUpload(event)
  const query = getQuery(event)

  const page = query.page ? parseInt(String(query.page), 10) : 1
  const imageType = (query.imageType === 'jpg' ? 'jpg' : 'png') as 'png' | 'jpg'
  const width = query.width ? parseInt(String(query.width), 10) : undefined
  const height = query.height ? parseInt(String(query.height), 10) : undefined

  try {
    const filePath = await pdfThumbnail(buffer, { page, imageType, width, height })
    const imageBuffer = await readFile(filePath)
    const base64 = imageBuffer.toString('base64')
    const ext = extname(filePath).slice(1).toLowerCase()
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'

    return successResponse({ image: base64, mimeType })
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Thumbnail generation failed'
    return errorResponse(message, 500, event)
  }
})
