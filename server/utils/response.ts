import type { H3Event } from "h3";

/** Standard success envelope */
export function successResponse<T>(data: T) {
	return { success: true as const, data };
}

/** Standard error envelope */
export function errorResponse(message: string, statusCode: number, event: H3Event) {
	setResponseStatus(event, statusCode);
	return { success: false as const, error: message };
}
