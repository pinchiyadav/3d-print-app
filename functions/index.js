const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Cloud Function to set user password (Admin only)
exports.setUserPassword = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { uid, newPassword, adminToken } = req.body;

      if (!uid || !newPassword || !adminToken) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Verify the admin token
      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      
      // Check if the requester is the admin
      const adminEmail = 'admin@example.com'; // Change this to match your ADMIN_EMAIL
      if (decodedToken.email !== adminEmail) {
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
      }

      // Update the user's password
      await admin.auth().updateUser(uid, {
        password: newPassword
      });

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error setting password:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});
