# Usage Guide

This guide covers how to call p2h-service from your NuxtHub webapp (or any other client).

## Prerequisites

- p2h-service is running and reachable (e.g. `https://p2h.example.com`)
- You have at least one key configured in p2h-service's `API_KEYS` env var
- Your webapp has the following env vars set:

```bash
P2H_SERVICE_URL=https://p2h.example.com
P2H_API_KEY=your_key_here
```

---

## How NuxtHub BlobObjects work

`blob.list()`, `blob.put()`, and `blob.head()` all return a **BlobObject** — metadata only:

```ts
{
  pathname: string       // e.g. "documents/report.pdf"
  contentType: string    // "application/pdf"
  size: number           // bytes
  uploadedAt: Date
  url?: string           // only if your driver exposes public URLs
}
```

To get the actual file content, call `blob.get(pathname)` — this returns a standard Web API [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob). That `Blob` is what you forward to p2h-service.

---

## Core pattern

All calls follow the same shape on your webapp's server side:

```ts
// 1. Get the PDF content from blob storage
const file = await blob.get(pathname)  // Blob | null
if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

// 2. Wrap it in multipart/form-data
const form = new FormData()
form.append('file', file, 'document.pdf')

// 3. POST to p2h-service with your API key
const result = await $fetch(`${process.env.P2H_SERVICE_URL}/api/convert/<operation>`, {
  method: 'POST',
  body: form,
  headers: { 'X-API-Key': process.env.P2H_API_KEY! }
})
```

All of this runs **server-side only** — neither the API key nor the p2h-service URL ever reaches the browser.

---

## Examples

### HTML Conversion

Convert a stored PDF to HTML.

```ts
// server/api/pdf/[...pathname]/html.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const { data } = await $fetch<{ success: true, data: { html: string } }>(
    `${process.env.P2H_SERVICE_URL}/api/convert/html`,
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  return { html: data.html }
})
```

---

### Text Extraction

Extract plain text from a stored PDF.

```ts
// server/api/pdf/[...pathname]/text.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const { data } = await $fetch<{ success: true, data: { text: string } }>(
    `${process.env.P2H_SERVICE_URL}/api/convert/text`,
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  return { text: data.text }
})
```

---

### Per-page Content

Get HTML or text broken down by page. Pass `?text=true` for plain text, omit for HTML.

```ts
// server/api/pdf/[...pathname]/pages.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string
  const query = getQuery(event)
  const textMode = query.text === 'true'

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const url = new URL(`${process.env.P2H_SERVICE_URL}/api/convert/pages`)
  if (textMode) url.searchParams.set('text', 'true')

  const { data } = await $fetch<{ success: true, data: { pages: string[], mode: string } }>(
    url.toString(),
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  return { pages: data.pages, mode: data.mode }
})
```

---

### Metadata Extraction

Extract document metadata (title, author, creation date, etc.).

```ts
// server/api/pdf/[...pathname]/meta.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const { data } = await $fetch<{ success: true, data: { meta: Record<string, unknown> } }>(
    `${process.env.P2H_SERVICE_URL}/api/convert/meta`,
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  return { meta: data.meta }
})
```

Example response shape:
```json
{
  "meta": {
    "dc:title": "Q3 Report",
    "dc:creator": "Jane Doe",
    "xmp:CreatorTool": "Microsoft Word",
    "pdf:PDFVersion": "1.7",
    "pdf:producer": "Adobe PDF Library 15.0"
  }
}
```

---

### Thumbnail Generation

Generate a preview image for a specific page. Returns base64-encoded image data.

```ts
// server/api/pdf/[...pathname]/thumbnail.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string
  const query = getQuery(event)

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const url = new URL(`${process.env.P2H_SERVICE_URL}/api/convert/thumbnail`)
  if (query.page)      url.searchParams.set('page',      String(query.page))
  if (query.imageType) url.searchParams.set('imageType', String(query.imageType))
  if (query.width)     url.searchParams.set('width',     String(query.width))
  if (query.height)    url.searchParams.set('height',    String(query.height))

  const { data } = await $fetch<{ success: true, data: { image: string, mimeType: string } }>(
    url.toString(),
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  // data.image is a base64 string; data.mimeType is e.g. "image/png"
  // You can use it directly as a data URL in the browser:
  //   <img :src="`data:${mimeType};base64,${image}`" />
  //
  // Or convert to a buffer to store it back in blob storage:
  const buffer = Buffer.from(data.image, 'base64')
  await blob.put(`thumbnails/${pathname}.png`, buffer, {
    contentType: data.mimeType
  })

  return { image: data.image, mimeType: data.mimeType }
})
```

---

### Image Extraction

Extract all images embedded inside a PDF.

```ts
// server/api/pdf/[...pathname]/images.get.ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const { data } = await $fetch<{
    success: true
    data: { images: Array<{ data: string, mimeType: string }> }
  }>(
    `${process.env.P2H_SERVICE_URL}/api/convert/images`,
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  return { images: data.images }
})
```

Each item in `images` is `{ data: string, mimeType: string }` where `data` is base64-encoded.
Use it as a data URL: `` `data:${img.mimeType};base64,${img.data}` ``

---

## Reusable helper

If you're calling p2h-service from multiple routes, extract a shared utility:

```ts
// server/utils/p2h.ts

type Operation = 'html' | 'text' | 'pages' | 'meta' | 'thumbnail' | 'images'

export async function convertPdf<T>(
  file: Blob,
  operation: Operation,
  params?: Record<string, string>
): Promise<T> {
  const form = new FormData()
  form.append('file', file, 'document.pdf')

  const url = new URL(`${process.env.P2H_SERVICE_URL}/api/convert/${operation}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await $fetch<{ success: true, data: T } | { success: false, error: string }>(
    url.toString(),
    {
      method: 'POST',
      body: form,
      headers: { 'X-API-Key': process.env.P2H_API_KEY! }
    }
  )

  if (!res.success) {
    throw createError({ statusCode: 500, message: (res as { success: false, error: string }).error })
  }

  return res.data
}
```

Then in your routes:

```ts
import { blob } from '@nuxthub/blob'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParams(event).pathname as string

  const file = await blob.get(pathname)
  if (!file) throw createError({ statusCode: 404, message: 'PDF not found' })

  const { text } = await convertPdf<{ text: string }>(file, 'text')
  return { text }
})
```

---

## Error handling

p2h-service returns a consistent error envelope:

```json
{ "success": false, "error": "Uploaded file does not appear to be a valid PDF" }
```

HTTP status codes:

| Code | Reason |
|---|---|
| `400` | Bad request (missing file, not a PDF, invalid params) |
| `401` | Missing or invalid `X-API-Key` |
| `413` | File exceeds `MAX_FILE_SIZE` |
| `429` | Rate limit exceeded — check `Retry-After` response header |
| `500` | pdf2html processing error (check Java is installed on the VPS) |

`$fetch` throws on non-2xx by default, so wrap calls in try/catch:

```ts
try {
  const { data } = await convertPdf<{ html: string }>(file, 'html')
  return data
} catch (err: any) {
  const message = err?.data?.error ?? err?.message ?? 'Conversion failed'
  throw createError({ statusCode: 502, message })
}
```
