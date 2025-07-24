import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['appointment', 'medication', 'healthTip', 'system'], 
    required: true 
  },
  messageContent: { 
    type: String, 
    required: true 
  },
  channel: { 
    type: String, 
    enum: ['email', 'sms', 'app', 'failed'], 
    default: 'app' 
  },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'failed'], 
    default: 'sent' 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'refModel' 
  },
  refModel: {
    type: String,
    enum: ['Appointment', 'MedicationReminder'],
    default: 'Appointment'
  },
  metadata: { 
    type: Object, 
    default: {} 
  }
}, { 
  timestamps: true 
});

// Create indexes for faster querying
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export default Notification; 