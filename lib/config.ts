export const SANDBOX_TIMEOUT_MS = 300_000; // 5 minutes in milliseconds

// Resolution boundaries for performance optimization
// The sandbox will run at full resolution, but screenshots sent to the LLM API
// will be scaled down to these dimensions to reduce bandwidth and tokens.
export const MAX_RESOLUTION_WIDTH = 1024;
export const MAX_RESOLUTION_HEIGHT = 768;
export const MIN_RESOLUTION_WIDTH = 640;
export const MIN_RESOLUTION_HEIGHT = 480;

// Default resolution used when none is specified
// NOTE: This should be within the max/min bounds defined above,
// otherwise it will be scaled automatically
export const DEFAULT_RESOLUTION: [number, number] = [1024, 720];

// Environment variables with fallback to hardcoded values for development
export const E2B_API_KEY = process.env.E2B_API_KEY || "e2b_6f718fcb928ee85abfe16b28ebecc6724d704727";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAAzKQqMXG1jJPNXdu0k_fO7PiAgntMb6k";
