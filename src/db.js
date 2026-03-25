import 'dotenv/config';
import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
const adapter = new PrismaPg({ connectionString, ssl });

const prisma = new PrismaClient({
  adapter,
});

export { prisma };
