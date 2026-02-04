import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { 
    type: String, 
    required: function() {
      // Only require password for local authentication
      return !this.provider || this.provider === 'local';
    }
  },
  role: { type: String, enum: ['admin', 'doctor', 'patient'], default: 'patient' },
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String, length: 6 },
  verificationCodeExpires: { type: Date },
  passwordChangeRequired: { type: Boolean, default: false },
  // OAuth fields
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  providerId: { type: String },
  avatar: { type: String }, // Profile picture URL from OAuth provider
}, { timestamps: true });

// Middleware to automatically set isAdmin flag for admin role and handle OAuth users
UserSchema.pre('save', function(next) {
  if (this.role === 'admin') {
    this.isAdmin = true;
  }
  
  // Set defaults for OAuth users
  if (this.provider === 'google') {
    this.role = 'patient'; // Always set to patient for OAuth users
    this.isVerified = true;
    this.passwordChangeRequired = false;
    // Explicitly unset password for OAuth users
    this.password = undefined;
  }
  
  next();
});

// Add a method to create OAuth users safely
UserSchema.statics.createOAuthUser = async function(userData) {
  const oauthUser = new this({
    ...userData,
    role: 'patient', // Always set to patient for OAuth users
    provider: userData.provider || 'google',
    isVerified: true,
    passwordChangeRequired: false,
    password: undefined // Explicitly no password for OAuth users
  });
  
  return await oauthUser.save();
};

export default mongoose.models.User || mongoose.model('User', UserSchema);