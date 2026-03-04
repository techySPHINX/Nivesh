#!/bin/bash
# Create the mlflow database if it doesn't already exist.
# This script is executed automatically by the postgres entrypoint
# on first initialisation (mounted into /docker-entrypoint-initdb.d/).

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE mlflow'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mlflow')\gexec
EOSQL
