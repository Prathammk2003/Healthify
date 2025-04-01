import mongoose from 'mongoose';

const MedicationReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  medicationName: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
    required: true,
  },
  time: {
    type: String, // e.g., "08:00 AM"
    required: true,
  },
  frequency: {
    type: String, // e.g., "Daily", "Twice a day"
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Taken', 'Sent'],
    default: 'Pending',
  },
  active: {
    type: Boolean,
    default: true,
  },
  enableVoiceCall: {
    type: Boolean,
    default: false,
  },
  lastSent: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const MedicationReminder = mongoose.models.MedicationReminder || mongoose.model('MedicationReminder', MedicationReminderSchema);

export default MedicationReminder; 
