import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export { schema };

// Re-export enums for easy access
export {
  documentTypeEnum,
  userRoleEnum,
  extractionStatusEnum,
  valueSourceEnum,
  valueTypeEnum,
} from './schema.js';

// Re-export types
export type {
  DocumentType,
  UserRole,
  ExtractionStatus,
  ValueSource,
  ValueType,
} from './schema.js';
