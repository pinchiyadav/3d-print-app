# 3D Print Order Management System

A comprehensive order management system for 3D printing businesses, allowing photographers to place orders, track earnings, and request payouts. The system consists of a web admin portal and mobile apps for photographers.

## 🏗️ Monorepo Structure

This project uses npm workspaces to manage multiple applications with shared code:

```
3d-print-app/
├── web/                    # React web application (Admin + Photographer portal)
├── mobile/                 # React Native mobile app (Photographer only)
├── shared/                 # Shared business logic and constants
├── functions/              # Firebase Cloud Functions
├── package.json            # Root workspace configuration
└── README.md              # This file
```

## 📦 Packages

### Web Application (`web/`)
- **Tech**: React 19 + Vite + TailwindCSS
- **Users**: Admins and Photographers
- **Features**:
  - Admin dashboard with full order management
  - User management and manual adjustments
  - Redeem request processing
  - 3D model management
  - Photographer dashboard with order placement

**[View Web README](./web/README.md)**

### Mobile Application (`mobile/`)
- **Tech**: React Native (Expo) + React Navigation
- **Users**: Photographers only
- **Features**:
  - Order placement with photo upload
  - Earnings tracking
  - Redeem requests
  - Profile management
  - Order history

**[View Mobile README](./mobile/README.md)**

### Shared Package (`shared/`)
- Firebase configuration
- Business constants (earning amounts, statuses)
- Utility functions for earnings calculations
- Collection path helpers

### Firebase Functions (`functions/`)
- Password reset functionality
- Future: Push notifications for order updates

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- npm v8 or higher
- Firebase CLI (for deployment)
- Expo CLI (for mobile development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd 3d-print-app
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

   This will install dependencies for all workspaces (web, mobile, shared).

### Running Applications

#### Web App
```bash
npm run web
# or
cd web && npm run dev
```

Visit http://localhost:5173

#### Mobile App
```bash
npm run mobile
# or
cd mobile && npm start
```

Scan the QR code with Expo Go app.

### Building for Production

#### Web
```bash
cd web
npm run build
```

#### Mobile
```bash
cd mobile
eas build --platform android
eas build --platform ios
```

## 💰 Business Logic

### Earning System
- **Delivered Order**: +₹300
- **Unaccepted Order**: -₹100 (penalty)
- **Rejected Order**: ₹0 (no penalty)
- **Manual Adjustments**: Admin can add/deduct amounts

### Order Workflow
1. Photographer places order with buyer details and photos
2. Admin receives order (status: pending)
3. Admin updates status: pending → printing → shipped → delivered
4. Alternative: Admin marks as unaccepted (penalty) or rejected

### Payout System
1. Photographer requests redeem with amount
2. Admin reviews request with bank details
3. Admin approves (marks as paid) or rejects with remarks

## 🔥 Firebase Setup

### Collections Structure
```
/artifacts/{appId}/public/data/
  ├── users/              # Photographer profiles
  ├── orders/             # All orders
  ├── redeemRequests/     # Payout requests
  ├── manualAdjustments/  # Admin adjustments
  └── models/             # 3D models catalog
```

### Security Rules
Configure Firestore security rules to:
- Allow photographers to read/write their own data
- Allow admin full access
- Protect sensitive operations

## 🛠️ Development

### Adding New Features

When adding features that affect both web and mobile:

1. **Add shared logic to `shared/`**:
   ```bash
   cd shared/src
   # Add constants, utils, or types
   ```

2. **Update web app**:
   ```bash
   cd web/src
   # Import from '@3d-print-app/shared'
   ```

3. **Update mobile app**:
   ```bash
   cd mobile/src
   # Import from '@3d-print-app/shared'
   ```

### Workspace Commands

```bash
# Install package to specific workspace
npm install <package> --workspace=web
npm install <package> --workspace=mobile
npm install <package> --workspace=shared

# Run script in specific workspace
npm run dev --workspace=web
npm run android --workspace=mobile

# Add workspace dependency
# In web/package.json or mobile/package.json
{
  "dependencies": {
    "@3d-print-app/shared": "*"
  }
}
```

## 📱 Platform Support

### Web
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Mobile browsers (responsive design)

### Mobile
- ✅ Android 5.0+ (API 21+)
- ✅ iOS 13.0+

## 🔐 Authentication

- Firebase Authentication (Email/Password)
- Admin account: `admin@example.com`
- Photographer self-registration
- Password reset via email

## 📊 Key Features

### For Photographers (Web + Mobile)
- ✅ Place orders with photo upload
- ✅ Track order status
- ✅ View earnings and transaction history
- ✅ Request payouts
- ✅ Manage profile and bank details
- ✅ View 3D models catalog

### For Admins (Web Only)
- ✅ Manage all orders
- ✅ Update order status
- ✅ Process payout requests
- ✅ Add manual adjustments
- ✅ Manage 3D models
- ✅ View user statistics
- ✅ Search and filter orders

## 🚧 Future Enhancements

- [ ] Push notifications for order updates
- [ ] Offline support for mobile app
- [ ] Order analytics and reports
- [ ] Bulk order operations
- [ ] Export data to CSV/PDF
- [ ] Multi-language support

## 📝 License

Proprietary - All rights reserved

## 👥 Contributors

- Development Team

## 📞 Support

For issues or questions:
- Email: support@example.com
- Documentation: [Link to docs]

---

**Note**: This is a monorepo. All shared code changes automatically reflect in both web and mobile apps after reinstalling dependencies.
