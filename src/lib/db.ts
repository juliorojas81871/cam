import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database configuration with fallback values
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cam_database',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

// Validate configuration
const missingVars: string[] = [];
if (!process.env.DB_HOST) missingVars.push('DB_HOST');
if (!process.env.DB_PORT) missingVars.push('DB_PORT');
if (!process.env.DB_NAME) missingVars.push('DB_NAME');
if (!process.env.DB_USER) missingVars.push('DB_USER');
if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD');

if (missingVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
  console.warn('Using default values. Please create a .env.local file with proper database credentials.');
  console.warn('Example .env.local file:');
  console.warn('DB_HOST=localhost');
  console.warn('DB_PORT=5432');
  console.warn('DB_NAME=cam_database');
  console.warn('DB_USER=postgres');
  console.warn('DB_PASSWORD=your_password');
}

const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

// Create postgres connection
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

export { schema };

