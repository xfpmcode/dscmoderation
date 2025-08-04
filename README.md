# Discord Moderation Bot Dashboard
Overview

This is a comprehensive Discord community management bot with a professional web dashboard, successfully deployed and operational. The system provides advanced moderation capabilities including case tracking, DM spam functionality, anti-spam protection, and extensive utility commands. The React-based dashboard offers real-time monitoring, server management, and detailed command references. All features are fully tested and working in production with PostgreSQL database integration.
User Preferences

Preferred communication style: Simple, everyday language.
Recent Changes

August 2, 2025: Successfully deployed comprehensive Discord community management bot with full web dashboard

    Bot deployed and active in Discord server (1 server connected)
    Complete case system with sequential numbering for all moderation actions
    DM spam command with customizable count and delay features
    Anti-spam protection with progressive enforcement (warn → timeout → kick)
    Real-time web dashboard with bot status monitoring and command reference
    All utility commands operational: /ping, /clean, /uptime, /slowmode, /case

System Architecture
Frontend Architecture

    Framework: React 18 with TypeScript using Vite as the build tool
    UI Framework: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
    Routing: Wouter for client-side routing with three main pages (Dashboard, Logs, Settings)
    State Management: TanStack Query (React Query) for server state management and API caching
    Form Handling: React Hook Form with Zod validation for type-safe form schemas

Backend Architecture

    Runtime: Node.js with Express.js server framework
    Language: TypeScript with ES modules
    API Design: RESTful API with endpoints for server configuration, custom commands, moderation logs, and tickets
    File Structure: Monorepo structure with separate client/, server/, and shared/ directories
    Development: Hot module replacement with Vite integration for seamless development experience

Discord Bot Architecture

    Library: Discord.js v14 with Gateway intents for guilds, members, messages, and reactions
    Command System: Slash commands with modular command handlers for moderation and utility functions
    Event Handling: Separate event handlers for member events (join/leave) and message events (spam protection, custom commands)
    Permission System: Role-based permission checking with server-specific moderator and admin role configurations
    Features: Auto-moderation, welcome messages, ticket system, custom commands, comprehensive logging, and case system
    New Commands: /ping, /clean, /uptime, /slowmode, /case for enhanced server management
    Anti-Spam: Automatic spam detection with progressive warnings, timeouts, and kicks

Data Storage Solutions

    Primary Database: PostgreSQL with Neon serverless driver for production deployments
    ORM: Drizzle ORM with code-first schema definition and type-safe queries
    Schema Design: Comprehensive schema covering server configurations, custom commands, moderation logs, support tickets, user warnings, and message logs
    Migrations: Drizzle Kit for database migrations with version control
    Fallback Storage: JSON file-based storage system for development and backup scenarios

Authentication and Authorization

    Discord Integration: No user authentication required - uses Discord server IDs for access control
    Permission Model: Server-based permissions using Discord roles and server-specific configurations
    Access Control: Role-based access with configurable moderator and admin roles per Discord server

External Dependencies
Core Infrastructure

    Database: Neon PostgreSQL serverless database with connection pooling
    Deployment: Replit-optimized with custom Vite plugins for development environment

Discord Integration

    Discord API: Discord.js library for comprehensive bot functionality including slash commands, event handling, and guild management
    Bot Permissions: Requires specific Discord bot permissions for kick, ban, manage messages, and channel management

Development and Build Tools

    Package Manager: npm with lockfile for consistent dependency resolution
    Build System: Vite with TypeScript compilation and React Fast Refresh
    Code Quality: TypeScript strict mode with comprehensive type checking across client, server, and shared modules

UI and Styling

    Component Library: Radix UI primitives for accessible, unstyled components
    Styling: Tailwind CSS with custom CSS variables for theming and dark mode support
    Icons: Lucide React for consistent iconography throughout the application

Utility Libraries

    Validation: Zod for runtime type validation and schema definition
    Date Handling: date-fns for date manipulation and formatting
    Styling Utilities: clsx and class-variance-authority for conditional styling and component variants
