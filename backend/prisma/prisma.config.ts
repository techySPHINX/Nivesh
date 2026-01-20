/**
 * Prisma Configuration for Nivesh Backend
 * Prisma v7+ configuration is handled through environment variables
 * @see https://pris.ly/d/prisma7-client-config
 */

// Configuration is managed through DATABASE_URL environment variable
// This file serves as documentation for Prisma v7 configuration

export const prismaConfig = {
  datasources: {
    db: {
      url: 'DATABASE_URL', // Environment variable name
    },
  },
};
