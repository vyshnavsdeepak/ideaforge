// Export all Inngest functions for registration
export * from './functions';
export * from './scheduled-jobs';

// Dynamically collect all exported functions
import * as functionsModule from './functions';
import * as scheduledJobsModule from './scheduled-jobs';

// Helper function to extract Inngest functions from a module
function extractInngestFunctions(module: Record<string, unknown>): unknown[] {
  return Object.values(module).filter((value) => {
    // Check if it's an Inngest function by looking for common properties
    return (
      value &&
      typeof value === 'object' &&
      'id' in value &&
      'fn' in value &&
      typeof (value as { fn?: unknown }).fn === 'function'
    );
  });
}

// Automatically collect all functions
const coreFunctions = extractInngestFunctions(functionsModule);
const scheduledFunctions = extractInngestFunctions(scheduledJobsModule);

// Create a single array of all functions for easy serving
export const allFunctions = [
  ...coreFunctions,
  ...scheduledFunctions,
] as unknown[];

// Export count for logging/debugging
export const functionCount = allFunctions.length;

// Log function names for debugging
const functionNames = allFunctions.map((fn) => (fn as { id?: string }).id).filter(Boolean);
console.log(`🚀 Inngest: Automatically loaded ${functionCount} functions:`, functionNames);