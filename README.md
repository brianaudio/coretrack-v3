# CoreTrack v3 - Business Inventory Management System

A comprehensive, SaaS-ready inventory management system designed for restaurants and businesses. Built with modern web technologies and optimized for iPad and mobile devices.

## 🚀 Features

### Core Modules

1. **Inventory Center** - Real-time inventory tracking and management
   - Live stock monitoring with low/critical alerts
   - Category-based organization
   - Automatic reorder suggestions
   - Historical usage tracking

2. **Point of Sale (POS)** - iPad-optimized order taking system
   - Touch-friendly interface
   - Quick category navigation
   - Cart management with modifications
   - Order processing and receipt printing

3. **Purchase Orders** - Supplier management and ordering
   - Automated purchase order generation
   - Supplier relationship management
   - Delivery tracking and notifications
   - Cost analysis and budgeting

4. **Analytics Dashboard** - Sales and performance insights
   - Real-time sales tracking
   - Inventory usage trends
   - Profit margin analysis
   - Performance benchmarking

5. **Expenses Management** - Financial tracking and budget control
   - Expense categorization and tracking
   - Budget monitoring with alerts
   - Vendor management
   - Receipt management

6. **Menu Builder** - Recipe and menu item management
   - Drag-and-drop menu creation
   - Recipe cost calculation
   - Nutritional information tracking
   - Allergen management

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Database**: Firebase Firestore (multi-tenant architecture)
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS with iPad OS-inspired design
- **State Management**: React Context + Custom hooks
- **Real-time Updates**: Firebase listeners

## 🎨 Design System

- **iPad OS-inspired** minimalistic interface
- **Touch-friendly** components (44px minimum touch targets)
- **Responsive design** for Chrome, Android, iPad, and laptop
- **System fonts** for optimal performance
- **Consistent color palette** with primary blue and surface grays

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Firebase**
   - Configure your Firebase project
   - Update the Firebase config in `src/lib/firebase.ts`

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Device Optimization

### iPad/Tablet
- Optimized touch targets
- Landscape and portrait modes
- Gesture-friendly navigation
- Apple Pencil support ready

### Mobile
- Progressive Web App (PWA) ready
- Offline functionality
- Touch gestures
- Mobile-first responsive design

### Desktop
- Keyboard shortcuts
- Multi-window support
- Advanced data views
- Bulk operations

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # Reusable components
│   ├── Dashboard.tsx     # Main dashboard
│   ├── Header.tsx        # Header component
│   ├── Login.tsx         # Authentication
│   ├── Sidebar.tsx       # Navigation sidebar
│   └── modules/          # Feature modules
│       ├── InventoryCenter.tsx
│       ├── POS.tsx
│       ├── PurchaseOrders.tsx
│       ├── Analytics.tsx
│       ├── Expenses.tsx
│       └── MenuBuilder.tsx
└── lib/                  # Utilities
    └── firebase.ts       # Firebase configuration
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### Tailwind CSS
The design system is configured in `tailwind.config.js` with:
- Custom color palette
- iPad-optimized spacing
- Animation utilities
- Component classes

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t coretrack .
docker run -p 3000:3000 coretrack
```

## 📊 Multi-Tenant Architecture

CoreTrack is designed for SaaS deployment with:
- **Tenant isolation** in Firestore
- **Role-based access control**
- **Scalable authentication**
- **Centralized billing**

## 🔒 Security

- Firebase Authentication
- Firestore security rules
- Input validation
- XSS protection
- CSRF tokens

## 📈 Performance

- **Code splitting** with Next.js
- **Image optimization**
- **Lazy loading** components
- **Service worker** for offline functionality
- **Real-time updates** without polling

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## 📱 PWA Features

- **Offline functionality**
- **Push notifications**
- **Home screen installation**
- **Background sync**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@coretrack.app
- 📞 Phone: +1 (555) 123-4567
- 💬 Discord: [Join our community](https://discord.gg/coretrack)

## 🗺 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Integration with payment processors
- [ ] Multi-location support
- [ ] API for third-party integrations
- [ ] Machine learning for demand forecasting

---

Built with ❤️ for the restaurant and business industry
