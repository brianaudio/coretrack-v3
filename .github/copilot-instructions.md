<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# CoreTrack - Business Inventory Management System

This is a Next.js TypeScript SaaS application for business inventory management with the following features:

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript and App Router
- **Database**: Firebase Firestore (multi-tenant)
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS with iPad OS-inspired minimalistic design
- **UI Components**: Custom components optimized for iPad/mobile

## Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/components/modules/` - Feature-specific modules (Inventory, POS, etc.)
- `src/lib/` - Utility functions and Firebase configuration

## Core Features
1. **Inventory Center** - Real-time inventory tracking and management
2. **Point of Sale (POS)** - iPad-optimized order taking system
3. **Purchase Orders** - Supplier management and ordering
4. **Analytics** - Sales and performance dashboards
5. **Expenses** - Financial tracking and budget management
6. **Menu Builder** - Recipe and menu item management

## Design Guidelines
- iPad OS-inspired minimalistic design
- Touch-friendly interfaces (44px minimum touch targets)
- Responsive design for Chrome, Android, iPad, and laptop
- Clean typography using system fonts
- Consistent color scheme with primary blue and surface grays

## Development Notes
- All components use TypeScript with proper typing
- Firebase Firestore for multi-tenant data architecture
- Tailwind CSS for styling with custom design system
- Modular architecture for easy debugging and maintenance
- Real-time data updates using Firebase listeners

## Code Style
- Use functional components with hooks
- Implement proper error boundaries
- Follow Next.js best practices for performance
- Use semantic HTML and proper accessibility attributes
