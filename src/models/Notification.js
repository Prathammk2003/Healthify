import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['appointment', 'medication', 'followup', 'healthTip', 'system'],
      required: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'sent', 'failed', 'pending'],
      default: 'unread',
    },
    channel: {
      type: String,
      enum: ['sms', 'email', 'push', 'app'],
      default: 'app',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'dynamic', // This will be determined by the type field
      default: null
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Object,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Create indexes for faster querying
NotificationSchema.index({ userId: 1, status: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ type: 1, referenceId: 1 });
NotificationSchema.index({ userId: 1, type: 1, isImportant: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

export default Notification; 