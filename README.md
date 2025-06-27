# FarmyFishFry

A Next.js-based trading platform for the BitCraft gaming community, specifically designed for the FarmFishFry cohort. This application enables cohort members to create and fulfill trade orders for in-game items across different tiers.

## Features

- **Discord OAuth Authentication** - Secure login with Discord accounts
- **Trade Order Management** - Create buy/sell orders for BitCraft items
- **Tier-based Pricing** - Support for items across 10 different tiers
- **Real-time Updates** - Live pricing data with hot-reload capability
- **Admin Panel** - Price management interface for administrators
- **Trading Statistics** - Market insights and leaderboards
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: NextAuth.js with Discord provider
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker with Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Discord application for OAuth

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd farmy-fish-fry
```

### 2. Set up Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 → General
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Note your Client ID and Client Secret

### 3. Environment Setup

```bash
# Copy the example environment file
cp env.example .env.local

# Edit .env.local with your values:
# - Add your Discord Client ID and Secret
# - Update database URL if needed
# - Generate a random NEXTAUTH_SECRET
```

### 4. Start the Application

#### Production Deployment

```bash
# Test the deployment locally
./deploy.sh

# For production deployment with Portainer:
# 1. Use docker-compose.production.yml
# 2. Update the GitHub URL in the file
# 3. Follow DEPLOYMENT.md for complete instructions
```

#### Development Mode

```bash
# Install dependencies (for development)
npm install

# Start services for development
docker-compose up -d db  # Start only database
npm run db:push         # Set up database schema
npm run dev            # Start development server
```

### 5. Access the Application

- Open http://localhost:3000
- Click "Sign in with Discord"
- Set your in-game name in your profile

## Production Deployment

For production deployment with Portainer or Docker Compose, see **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions.

**Quick deployment:**
1. Edit `docker-compose.production.yml` with your GitHub repository URL
2. Set up Discord OAuth with your production URL
3. Deploy to Portainer with environment variables

## Project Structure

```
farmy-fish-fry/
├── src/
│   ├── app/                 # Next.js 14 app router
│   │   ├── page.tsx        # Homepage (prices + leaderboard)
│   │   ├── orders/         # Order management pages
│   │   ├── profile/        # User profile page
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   └── ui/             # shadcn/ui components
│   └── lib/                # Utilities and configurations
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── docker-compose.yml      # Docker services
└── package.json           # Dependencies and scripts
```

## Database Schema

### User Model

- `id`: Unique identifier
- `discordId`: Discord user ID
- `discordName`: Discord username
- `inGameName`: BitCraft in-game name (optional)

### Order Model

- `id`: Unique identifier
- `itemName`: Name of the item
- `tier`: Item tier (integer)
- `pricePerUnit`: Price per unit (float)
- `amount`: Quantity needed/offered
- `status`: OPEN | IN_PROGRESS | FULFILLED
- `creatorId`: User who created the order
- `claimerId`: User who claimed the order (optional)

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio (database GUI)
```

## Docker Commands

```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs app       # View app logs
docker-compose exec db psql -U postgres -d farmy-fish-fry  # Access database
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
