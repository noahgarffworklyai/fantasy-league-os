import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://flos:flos@localhost:5432/fantasy_league_os';

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
