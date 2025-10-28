# CAM Ventures - Property Management System

A Next.js application for managing owned and leased properties with comprehensive analytics, mapping, and data visualization features.

## Features

- **Property Management**: View and filter owned and leased properties
- **Interactive Maps**: Google Maps integration with Street View support
- **Analytics Dashboard**: Charts and statistics for property data
- **Lease Management**: Track lease expiration dates and status
- **TypeScript**: Full type safety throughout the application
- **Material-UI**: Modern, responsive UI components

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI Framework**: Material-UI (MUI)
- **Database**: PostgreSQL with Drizzle ORM
- **Charts**: Recharts
- **Maps**: Google Maps API
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Maps API key (for map features)

### Installation

1. Clone the repository and navigate to the project:

\`\`\`bash
cd cam-project
\`\`\`

2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

3. Create environment variables file:

Copy the example file and update with your credentials:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` with your actual values:

\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cam_database
DB_USER=postgres
DB_PASSWORD=your_password

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
\`\`\`

### Database Setup

1. Make sure PostgreSQL is running

2. Initialize the database tables:

\`\`\`bash
npm run db:setup
\`\`\`

3. Import the Excel data (make sure the .xlsx files are in the project root):

\`\`\`bash
npm run db:import
\`\`\`

Or run both commands at once:

\`\`\`bash
npm run db:init
\`\`\`

### Running the Application

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:setup` - Create/reset database tables
- `npm run db:import` - Import Excel data
- `npm run db:init` - Setup tables and import data
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Pages

- **/** - Properties overview with filtering and sorting
- **/owned** - Owned properties dashboard with analytics
- **/leased** - Leased properties with expiration tracking
- **/map** - Interactive map view

## API Routes

- `GET /api/owned` - Get all owned properties
- `GET /api/leases` - Get all lease properties
- `GET /api/health` - Health check

## Data Files

The application expects two Excel files in the project root:
- `2025-5-23-iolp-buildings.xlsx` - Buildings data
- `2025-5-23-iolp-leases.xlsx` - Leases data

## Environment Variables

### Database (Required)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Google Maps (Optional, for map features)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

## Development

This project uses:
- TypeScript for type safety
- ESLint for code quality
- Material-UI for consistent styling
- Drizzle ORM for type-safe database queries
