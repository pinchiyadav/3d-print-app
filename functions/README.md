# Firebase Cloud Functions - Password Management

This folder contains the Cloud Function required for the admin to set user passwords directly.

## Setup Instructions

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Functions in your project
Navigate to the root of your project and run:
```bash
firebase init functions
```
- Select your existing project (model-3d-print)
- Choose JavaScript
- Say No to ESLint (or Yes if you prefer)
- Say No to overwriting existing files

### 4. Install dependencies
```bash
cd functions
npm install
```

### 5. Update Admin Email
In `functions/index.js`, update line 29:
```javascript
const adminEmail = 'admin@example.com'; // Change this to your admin email
```

### 6. Deploy the function
```bash
firebase deploy --only functions
```

### 7. Update the function URL in your app
After deployment, Firebase will provide you with a URL like:
```
https://us-central1-model-3d-print.cloudfunctions.net/setUserPassword
```

If your URL is different, update it in:
- `src/components/Admin.jsx` in the `handleSetPassword` function (around line 120)

## Security Notes

- This function verifies that only requests from authenticated admin users are accepted
- It checks the Firebase Auth token to ensure the requester is the admin
- Make sure to keep your admin email private and secure
- The function runs server-side using Firebase Admin SDK, which has elevated privileges

## Testing

1. Deploy the function
2. Log in as admin in your app
3. Go to "Manage User" page
4. Search for a user
5. Enter a new password and confirm
6. Click "Set New Password"

## Troubleshooting

If you get CORS errors:
- Make sure the `cors` package is installed
- Check that the function URL matches what you're calling

If you get authentication errors:
- Verify the admin email matches in both the Cloud Function and your app's firebase.config.js
- Ensure the admin token is being passed correctly
