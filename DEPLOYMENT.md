# FarmyFishFry - Production Deployment Guide

This guide explains how to deploy FarmyFishFry to production using Docker and Portainer.

## Prerequisites

- Docker and Docker Compose installed on your server
- Portainer installed and running
- Discord application set up for OAuth authentication
- Your code pushed to a GitHub repository

## Quick Start with Portainer (Zero-Downtime Deployment)

### 1. Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use an existing one
3. Go to OAuth2 settings
4. Add redirect URI: `http://your-domain.com:7854/api/auth/callback/discord` (replace with your actual domain)
5. Copy the Client ID and Client Secret

### 2. Initialize Docker Swarm (One-time setup)

**On your server, run this command once:**

```bash
docker swarm init
```

This enables Docker Swarm mode, which provides built-in zero-downtime deployments.

### 3. Deploy with Portainer

1. **In Portainer:**

   - Go to **Stacks** → **Add stack**
   - Name your stack (e.g., `farmy-fish-fry`)
   - Choose **Upload** and upload the `docker-compose.production.yml` file

2. **Set Environment Variables:**

   ```
   POSTGRES_DB=farmy-fish-fry
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-secure-password
   DB_PORT=5432
   APP_PORT=7854
   NEXTAUTH_URL=http://your-domain.com:7854
   NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   SEED_DATABASE=false
   ADMIN_SECRET=your-admin-secret-change-in-production
   ```

3. **Deploy the stack**

The application will now run with 2 replicas for high availability and zero-downtime updates.

### 3. Access Your Application

- Application: `http://your-server-ip:7854`
- Database: `your-server-ip:5432` (if you need direct access)

## Production Considerations

### Security

1. **Change default passwords**: Update `POSTGRES_PASSWORD` and `NEXTAUTH_SECRET`
2. **Use strong secrets**: Generate a secure `NEXTAUTH_SECRET` (minimum 32 characters)
3. **Firewall**: Only expose port 7854 publicly, keep 5432 internal
4. **HTTPS**: Use a reverse proxy (nginx, Traefik) with SSL certificates

### Reverse Proxy Setup (Recommended)

Add this to your nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:7854;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Variables Reference

| Variable                | Description                        | Required | Example                       |
| ----------------------- | ---------------------------------- | -------- | ----------------------------- |
| `POSTGRES_DB`           | Database name                      | **Yes**  | `farmy-fish-fry`              |
| `POSTGRES_USER`         | Database user                      | **Yes**  | `postgres`                    |
| `POSTGRES_PASSWORD`     | Database password                  | **Yes**  | `your-secure-password`        |
| `DB_PORT`               | Database port                      | **Yes**  | `5432`                        |
| `APP_PORT`              | Application port                   | **Yes**  | `7854`                        |
| `NEXTAUTH_URL`          | Full URL of your app               | **Yes**  | `http://your-domain.com:7854` |
| `NEXTAUTH_SECRET`       | NextAuth secret key                | **Yes**  | `32-char-random-string`       |
| `DISCORD_CLIENT_ID`     | Discord OAuth Client ID            | **Yes**  | `your_client_id`              |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret        | **Yes**  | `your_client_secret`          |
| `SEED_DATABASE`         | Seed database on startup           | **Yes**  | `false`                       |
| `ADMIN_SECRET`          | Admin API secret for price updates | **Yes**  | `your-admin-secret`           |

## Updating the Application

### Code Updates (Zero Downtime! 🚀)

To update to a new version:

1. **Push your code changes** to your Docker registry (Docker Hub)
2. **In Portainer, go to your stack**
3. **Click "Update the stack"**
4. **Check "Re-pull image and redeploy"**
5. **Click "Update"**

Docker Swarm will automatically perform a rolling update:

- ✅ Pull the new image
- ✅ Start new containers with the updated code
- ✅ Wait for health checks to pass
- ✅ Route traffic to new containers
- ✅ Stop old containers
- ✅ **Zero downtime achieved!**

You can monitor the update progress in Portainer under "Services" - you'll see both replicas updating one at a time.

### Price Updates (Zero Downtime) 🚀

#### Option 1: Web Admin Interface (Recommended)

1. Visit `http://your-domain:7854/admin/pricing`
2. Enter your `ADMIN_SECRET`
3. Update prices directly in the web interface
4. Changes apply immediately without downtime

#### Option 2: API Calls

```bash
# Update a specific item's prices
curl -X PUT http://your-domain:7854/api/admin/pricing \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your-admin-secret" \
  -d '{
    "itemName": "fish",
    "prices": {
      "tier1": 1.5,
      "tier2": 2.0,
      "tier3": 2.5,
      "tier4": 3.0
    }
  }'

# View current pricing data
curl -H "X-Admin-Secret: your-admin-secret" \
  http://your-domain:7854/api/admin/pricing
```

## Backup and Restore

### Backup Database

```bash
docker exec farmy-fish-fry-db-1 pg_dump -U postgres farmy-fish-fry > backup.sql
```

### Restore Database

```bash
docker exec -i farmy-fish-fry-db-1 psql -U postgres farmy-fish-fry < backup.sql
```

## Monitoring

The application includes health checks:

- Application health: `http://your-domain.com:7854/api/health`
- Database health: Automatic via Docker health checks

## Troubleshooting

### Common Issues

1. **Discord OAuth not working**: Check your redirect URI matches exactly
2. **Database connection failed**: Verify `DATABASE_URL` and database credentials
3. **Application won't start**: Check logs with `docker logs farmy-fish-fry-app-1`

### Viewing Logs

```bash
# Application logs
docker logs farmy-fish-fry-app-1 -f

# Database logs
docker logs farmy-fish-fry-db-1 -f
```

### Reset Everything

To completely reset (⚠️ **This will delete all data**):

```bash
docker-compose down -v
docker-compose up -d
```

## Support

If you encounter issues:

1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Discord OAuth is configured properly
4. Check that ports are not in use by other services
