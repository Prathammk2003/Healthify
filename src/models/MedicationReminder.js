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
    type: String, // e.g., "08:00"
    required: function() {
      return !this.times || this.times.length === 0;
    },
  },
  times: [{
    type: String, // Array of times for multiple doses per day (e.g., ["08:00", "20:00"])
  }],
  daysOfWeek: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  daysOfMonth: [{
    type: Number,
    min: 1,
    max: 31,
  }],
  frequency: {
    type: String, // e.g., "Daily", "Twice Daily", "Weekly", "Monthly", "As Needed"
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
