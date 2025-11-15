# 3D Print Order - Mobile App

A React Native mobile application for photographers to manage 3D print orders, track earnings, and request payouts.

## Features

### User Features (Photographers)
- 📱 **Authentication**: Login, signup, and password reset
- 📊 **Dashboard**: View order statistics and redeemable earnings
- 📦 **Place Orders**: Create new orders with photo uploads (up to 10 photos)
- 📋 **My Orders**: View all orders with filtering and details
- 👤 **Profile Management**: Update contact info and bank details
- 💰 **Earnings**: Track earnings, penalties, and payouts
- 🔄 **Redeem History**: View all payout requests and their status
- 🎨 **3D Models**: Browse available 3D printing models

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation 7
- **Backend**: Firebase (Auth, Firestore, Storage)
- **State Management**: React Context API
- **Shared Code**: Monorepo with shared business logic

## Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   └── UI.js              # Reusable UI components
│   ├── navigation/
│   │   └── AppNavigator.js    # Navigation setup
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── SignupScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── PlaceOrderScreen.js
│   │   ├── MyOrdersScreen.js
│   │   ├── OrderDetailsScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── EarningsScreen.js
│   │   ├── RedeemHistoryScreen.js
│   │   └── ModelsScreen.js
│   ├── services/
│   │   ├── firebase.js        # Firebase configuration
│   │   └── AuthContext.js     # Authentication context
│   └── utils/
├── App.js                      # Main entry point
├── app.json                    # Expo configuration
└── package.json                # Dependencies
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI**: `npm install -g expo-cli`
4. **Expo Go app** on your phone (for testing)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Installation

1. Navigate to the project root:
   ```bash
   cd /path/to/3d-print-app
   ```

2. Install all workspace dependencies:
   ```bash
   npm install
   ```

3. Navigate to the mobile folder:
   ```bash
   cd mobile
   ```

### Running the App

#### Development Mode

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

3. Or press:
   - `a` - Open on Android emulator
   - `i` - Open on iOS simulator (macOS only)
   - `w` - Open in web browser

#### Running on Android Emulator

1. Install Android Studio and set up an Android emulator
2. Start the emulator
3. Run:
   ```bash
   npm run android
   ```

#### Running on iOS Simulator (macOS only)

1. Install Xcode from the App Store
2. Run:
   ```bash
   npm run ios
   ```

## Firebase Configuration

The app uses shared Firebase configuration from the `shared` package. No additional Firebase setup is needed for the mobile app as it uses the same Firebase project as the web app.

### Important Files
- **Shared Config**: `../shared/src/firebase/config.js`
- **Mobile Adapter**: `src/services/firebase.js`

## Building for Production

### Android (APK/AAB)

1. Build using EAS (Expo Application Services):
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform android
   ```

2. Or create a standalone APK:
   ```bash
   expo build:android
   ```

### iOS (IPA)

1. Build using EAS:
   ```bash
   eas build --platform ios
   ```

2. Note: iOS builds require an Apple Developer account ($99/year)

## Push Notifications Setup (Future)

The app is configured for push notifications but requires additional setup:

1. **Firebase Cloud Messaging**:
   - Add `google-services.json` (Android) to `android/app/`
   - Add `GoogleService-Info.plist` (iOS) to `ios/`

2. **Implement notification handlers** in `src/services/notifications.js`

3. **Update Firebase Cloud Functions** to send notifications when order status changes

## Environment Variables

Create a `.env` file in the mobile directory if you need environment-specific configuration:

```env
# Example (if needed)
API_URL=https://your-api-url.com
```

## Troubleshooting

### Common Issues

1. **Metro bundler errors**:
   ```bash
   npm start -- --reset-cache
   ```

2. **Module not found errors**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Firebase persistence errors**:
   - Make sure `react-native-get-random-values` is imported first in `App.js`

4. **Image picker not working**:
   - Check that permissions are granted in app settings
   - Reinstall the app

### Debugging

1. **Console logs**: Shake the device → "Debug JS Remotely"
2. **React Native Debugger**: Install and use for better debugging
3. **Expo DevTools**: Press `d` in the terminal

## Key Dependencies

- `expo` - Development framework
- `react-navigation` - Navigation
- `firebase` - Backend services
- `expo-image-picker` - Photo selection
- `expo-notifications` - Push notifications
- `@react-native-async-storage/async-storage` - Local storage

## Monorepo Structure

This mobile app is part of a monorepo:
- **web/**: React web application
- **mobile/**: React Native mobile app (this project)
- **shared/**: Shared business logic and constants
- **functions/**: Firebase Cloud Functions

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact: [your-email@example.com]
