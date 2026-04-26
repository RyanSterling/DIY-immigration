/**
 * Visa Config Registry
 * Central loader for visa-specific configurations.
 * Each visa type has its own config file with guidance, timeline, questions, etc.
 */

// Lazy-load visa configs to avoid bundling all at once
const visaConfigLoaders = {
  k1: () => import('./k1'),
  // Add more visa types as needed:
  // h1b: () => import('./h1b'),
  // eb1a: () => import('./eb1a'),
  // o1a: () => import('./o1a'),
};

// Supported visa types for validation
export const SUPPORTED_VISA_TYPES = Object.keys(visaConfigLoaders);

/**
 * Load a visa configuration by type (async)
 * @param {string} visaType - The visa type code (e.g., 'k1', 'h1b')
 * @returns {Promise<Object>} The visa configuration object
 */
export async function getVisaConfig(visaType) {
  const loader = visaConfigLoaders[visaType];
  if (!loader) {
    throw new Error(`Unknown visa type: ${visaType}. Supported types: ${SUPPORTED_VISA_TYPES.join(', ')}`);
  }
  const module = await loader();
  return module.default;
}

/**
 * Check if a visa type is supported
 * @param {string} visaType - The visa type code to check
 * @returns {boolean}
 */
export function isValidVisaType(visaType) {
  return visaType in visaConfigLoaders;
}
