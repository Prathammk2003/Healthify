import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'doctor', 'patient'], default: 'patient' },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

// Middleware to automatically set isAdmin flag for admin role
UserSchema.pre('save', function(next) {
  if (this.role === 'admin') {
    this.isAdmin = true;
  }
  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);