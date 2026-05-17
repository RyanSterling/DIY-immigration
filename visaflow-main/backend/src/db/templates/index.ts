import { i765Template } from './i-765.js';
import type { SeedFormTemplate } from './types.js';

// Re-export types for convenience
export * from './types.js';

// Export individual templates
export { i765Template };

// Export array of all templates for seeding
export const templates: SeedFormTemplate[] = [
  i765Template,
];
