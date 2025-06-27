# FarmFishFryTrade - Production Deployment Guide

This guide explains how to deploy FarmFishFryTrade to production using Docker and Portainer.

## Prerequisites

- Docker and Docker Compose installed on your server
- Portainer installed and running
- Discord application set up for OAuth authentication
- Your code pushed to a GitHub repository

## Quick Start with Portainer

### 1. Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use an existing one
3. Go to OAuth2 settings
4. Add redirect URI: `http://your-domain.com:7854/api/auth/callback/discord` (replace with your actual domain)
5. Copy the Client ID and Client Secret

### 2. Deploy with Portainer

1. **Download the production docker-compose file:**
   - Get `docker-compose.production.yml` from your repository
   - Edit the GitHub URL: Replace `YOUR_USERNAME` with your actual GitHub username

2. **In Portainer:**
   - Go to **Stacks** → **Add stack**
   - Name your stack (e.g., `farmfishfrytrade`)
   - Choose **Upload** and upload the `docker-compose.production.yml` file

3. **Set Environment Variables:**
   ```
   POSTGRES_DB=farmfishfrytrade
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-secure-password
   DB_PORT=5432
   APP_PORT=7854
   NEXTAUTH_URL=http://your-domain.com:7854
   NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   SEED_DATABASE=false
   ```

4. **Deploy the stack**

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

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `POSTGRES_DB` | Database name | **Yes** | `farmfishfrytrade` |
| `POSTGRES_USER` | Database user | **Yes** | `postgres` |
| `POSTGRES_PASSWORD` | Database password | **Yes** | `your-secure-password` |
| `DB_PORT` | Database port | **Yes** | `5432` |
| `APP_PORT` | Application port | **Yes** | `7854` |
| `NEXTAUTH_URL` | Full URL of your app | **Yes** | `http://your-domain.com:7854` |
| `NEXTAUTH_SECRET` | NextAuth secret key | **Yes** | `32-char-random-string` |
| `DISCORD_CLIENT_ID` | Discord OAuth Client ID | **Yes** | `your_client_id` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret | **Yes** | `your_client_secret` |
| `SEED_DATABASE` | Seed database on startup | **Yes** | `false` |

## Updating the Application

To update to a new version:

1. Push your code changes to your Git repository
2. In Portainer, go to your stack
3. Click **Re-pull and redeploy**
4. The application will automatically:
   - Pull the latest code from Git
   - Rebuild the Docker image
   - Run database migrations
   - Restart with zero downtime

## Backup and Restore

### Backup Database

```bash
docker exec farmfishfrytrade-db-1 pg_dump -U postgres farmfishfrytrade > backup.sql
```

### Restore Database

```bash
docker exec -i farmfishfrytrade-db-1 psql -U postgres farmfishfrytrade < backup.sql
```

## Monitoring

The application includes health checks:

- Application health: `http://your-domain.com:7854/api/health`
- Database health: Automatic via Docker health checks

## Troubleshooting

### Common Issues

1. **Discord OAuth not working**: Check your redirect URI matches exactly
2. **Database connection failed**: Verify `DATABASE_URL` and database credentials
3. **Application won't start**: Check logs with `docker logs farmfishfrytrade-app-1`

### Viewing Logs

```bash
# Application logs
docker logs farmfishfrytrade-app-1 -f

# Database logs  
docker logs farmfishfrytrade-db-1 -f
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