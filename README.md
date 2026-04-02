# p2h-service

A self-hosted PDF conversion service built with [Nuxt 4](https://nuxt.com) and [pdf2html](https://github.com/shebinleo/pdf2html). Exposes a secure REST API for converting PDFs to HTML, extracting text, generating thumbnails, and more — designed to be used as a private backend service from other applications.

## Why a separate service?

`pdf2html` relies on **Java** (Apache Tika + PDFBox) and is a heavy dependency. This service isolates that complexity on a VPS, exposing a lightweight HTTP API that any client (e.g. a Vercel-deployed webapp) can call without needing Java or bundling the package itself.

## Prerequisites

- **Node.js** >= 18
- **Java JRE** >= 8 (required by pdf2html — [download here](https://www.java.com/en/download/))
- **Bun** >= 1.2 (package manager)

Verify Java is available:

```bash
java -version
```

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/p2h-service.git
cd p2h-service

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env and set at minimum API_KEYS
```

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and adjust:

| Variable               | Required | Default                 | Description                            |
| ---------------------- | -------- | ----------------------- | -------------------------------------- |
| `API_KEYS`             | Yes      | —                       | Comma-separated list of valid API keys |
| `RATE_LIMIT_MAX`       | No       | `60`                    | Max requests per key per window        |
| `RATE_LIMIT_WINDOW_MS` | No       | `60000`                 | Rate limit window in milliseconds      |
| `MAX_FILE_SIZE`        | No       | _(unlimited)_           | Max PDF upload size in bytes           |
| `NUXT_PUBLIC_SITE_URL` | No       | `http://localhost:3000` | Public URL of this service             |

Generate a key:

```bash
openssl rand -hex 32
```

## Running

```bash
# Development (with hot reload)
bun run dev

# Production build
bun run build

# Preview production build
bun run preview
```

## API Reference

All API endpoints require the `X-API-Key` header with a valid key from `API_KEYS`.

### Common

- **Request**: `POST` with `multipart/form-data`, field name `file` containing the PDF
- **Response**: JSON envelope `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- **Error codes**: `400` bad request, `401` unauthorized, `413` file too large, `429` rate limited, `500` processing error

---

### `POST /api/convert/html`

Convert a PDF to a full HTML string.

```bash
curl -X POST https://your-service.example.com/api/convert/html \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{ "success": true, "data": { "html": "<html>...</html>" } }
```

---

### `POST /api/convert/text`

Extract plain text from a PDF.

```bash
curl -X POST https://your-service.example.com/api/convert/text \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{ "success": true, "data": { "text": "Lorem ipsum..." } }
```

---

### `POST /api/convert/pages`

Get HTML or text per page.

| Query param | Default | Description                               |
| ----------- | ------- | ----------------------------------------- |
| `text`      | `false` | Set to `true` to get text instead of HTML |

```bash
# HTML per page
curl -X POST "https://your-service.example.com/api/convert/pages" \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"

# Text per page
curl -X POST "https://your-service.example.com/api/convert/pages?text=true" \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{ "success": true, "data": { "pages": ["<p>Page 1...</p>", "..."], "mode": "html" } }
```

---

### `POST /api/convert/meta`

Extract PDF metadata (title, author, creation date, etc.).

```bash
curl -X POST https://your-service.example.com/api/convert/meta \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{
	"success": true,
	"data": {
		"meta": {
			"dc:title": "My Document",
			"dc:creator": "John Doe",
			"xmp:CreatorTool": "Microsoft Word",
			"pdf:PDFVersion": "1.7"
		}
	}
}
```

---

### `POST /api/convert/thumbnail`

Generate a preview image for a specific page.

| Query param | Default | Description             |
| ----------- | ------- | ----------------------- |
| `page`      | `1`     | Page number to render   |
| `imageType` | `png`   | `png` or `jpg`          |
| `width`     | `160`   | Output width in pixels  |
| `height`    | `226`   | Output height in pixels |

```bash
curl -X POST "https://your-service.example.com/api/convert/thumbnail?page=1&imageType=png&width=300" \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{
	"success": true,
	"data": {
		"image": "<base64 string>",
		"mimeType": "image/png"
	}
}
```

---

### `POST /api/convert/images`

Extract all images embedded in the PDF.

```bash
curl -X POST https://your-service.example.com/api/convert/images \
  -H "X-API-Key: your_key_here" \
  -F "file=@document.pdf"
```

**Response:**

```json
{
	"success": true,
	"data": {
		"images": [
			{ "data": "<base64>", "mimeType": "image/png" },
			{ "data": "<base64>", "mimeType": "image/jpeg" }
		]
	}
}
```

---

## Security

- **API key authentication**: All `/api/**` routes require a valid `X-API-Key` header. Keys are configured via the `API_KEYS` environment variable (comma-separated). Supporting multiple keys allows per-consumer revocation.
- **Rate limiting**: Configurable in-memory per-key rate limiting (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`).
- **File validation**: Uploads are validated by PDF magic bytes (`%PDF`) before processing.
- **File size limits**: Configurable via `MAX_FILE_SIZE`.

## Test UI

A browser-based test console is available at the root URL (`/`). It lets you upload PDFs and call any operation directly from a UI — useful for manual testing and debugging without needing curl.

## License

MIT
