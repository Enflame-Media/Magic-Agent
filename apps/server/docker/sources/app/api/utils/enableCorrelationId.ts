import { Fastify } from "../types";
import { generateCorrelationId, isValidCorrelationId, CORRELATION_ID_HEADER } from "@/utils/correlationId";

/**
 * Enables correlation ID tracking for all HTTP requests.
 *
 * - Extracts correlation ID from incoming request header if present and valid
 * - Generates a new correlation ID if none provided
 * - Attaches correlation ID to request object for use in handlers
 * - Includes correlation ID in response headers for client-side tracing
 */
export function enableCorrelationId(app: Fastify) {
    app.addHook('onRequest', async (request, reply) => {
        // Check for existing correlation ID in request headers
        const incomingId = request.headers[CORRELATION_ID_HEADER] as string | undefined;

        // Use existing ID if valid, otherwise generate new one
        if (incomingId && isValidCorrelationId(incomingId)) {
            request.correlationId = incomingId;
        } else {
            request.correlationId = generateCorrelationId();
        }

        // Set correlation ID in response headers for client-side tracing
        reply.header(CORRELATION_ID_HEADER, request.correlationId);
    });
}
