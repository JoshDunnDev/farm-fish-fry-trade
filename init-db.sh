#!/bin/bash
set -e

echo "Initializing database for FarmyFishFry..."

# The database and user are already created by the POSTGRES_* environment variables
# This script runs after the database is created but before the container is marked as ready

echo "Database initialization completed!" 