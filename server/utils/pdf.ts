import * as pdf2html from "pdf2html";

export interface ThumbnailOptions {
	page?: number;
	imageType?: "png" | "jpg";
	width?: number;
	height?: number;
	maxBuffer?: number;
}

export interface PageOptions {
	text?: boolean;
	maxBuffer?: number;
}

export interface ProcessingOptions {
	maxBuffer?: number;
}

/**
 * Convert a PDF buffer to a full HTML string.
 */
export async function pdfToHtml(buffer: Buffer, options?: ProcessingOptions): Promise<string> {
	return pdf2html.html(buffer, options);
}

/**
 * Extract plain text from a PDF buffer.
 */
export async function pdfToText(buffer: Buffer, options?: ProcessingOptions): Promise<string> {
	return pdf2html.text(buffer, options);
}

/**
 * Get per-page HTML or text from a PDF buffer.
 */
export async function pdfToPages(buffer: Buffer, options?: PageOptions): Promise<string[]> {
	return pdf2html.pages(buffer, options);
}

/**
 * Extract metadata from a PDF buffer.
 */
export async function pdfMeta(
	buffer: Buffer,
	options?: ProcessingOptions,
): Promise<Record<string, unknown>> {
	return pdf2html.meta(buffer, options);
}

/**
 * Generate a thumbnail for one page of a PDF.
 * Returns the absolute path to the generated image file.
 */
export async function pdfThumbnail(buffer: Buffer, options?: ThumbnailOptions): Promise<string> {
	return pdf2html.thumbnail(buffer, options);
}

/**
 * Extract all embedded images from a PDF buffer.
 * Returns absolute paths to the extracted image files.
 */
export async function pdfExtractImages(
	buffer: Buffer,
	options?: ProcessingOptions,
): Promise<string[]> {
	return pdf2html.extractImages(buffer, options);
}
