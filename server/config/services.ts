/**
 * Service Configuration
 * 
 * Centralized service names for deployment and infrastructure.
 * Used by: render.yaml, docker-compose, PM2, package.json scripts.
 */

const PROJECT_NAME = 'datoro'

export const SERVICES = {
  /** Backend API service */
  api: {
    name: `${PROJECT_NAME}-api`,
    port: 7071,
  },
  
  /** Frontend web service */
  frontend: {
    name: PROJECT_NAME,
  },
  
  /** PostgreSQL database */
  database: {
    name: `${PROJECT_NAME}-db`,
    databaseName: PROJECT_NAME,
    user: PROJECT_NAME,
  },
  
  /** Redis cache */
  redis: {
    name: `${PROJECT_NAME}-redis`,
  },
  
  /** Docker development containers */
  docker: {
    postgres: `${PROJECT_NAME}-postgres-dev`,
    redis: `${PROJECT_NAME}-redis-dev`,
    postgresUser: `${PROJECT_NAME}_dev`,
    postgresDb: `${PROJECT_NAME}_dev`,
  },
} as const

export default SERVICES
