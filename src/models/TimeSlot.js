import mongoose from 'mongoose';

const TimeSlotSchema = new mongoose.Schema({
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor', 
    required: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid doctor ID!`
    }
  },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM (24-hour)
  duration: { type: Number, default: 30, min: 15 }, // Duration in minutes
  isBooked: { type: Boolean, default: false },
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment',
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/undefined
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid appointment ID!`
    }
  },
  // For recurring slots based on doctor's general availability
  isRecurring: { type: Boolean, default: false },
  
  // To track when slots were generated or updated
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for quick lookups
TimeSlotSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

const TimeSlot = mongoose.models.TimeSlot || mongoose.model('TimeSlot', TimeSlotSchema);

export default TimeSlot; 