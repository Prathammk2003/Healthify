import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
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
  date: { type: String, required: true },
  time: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid user ID!`
    }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  notes: { type: String },
  // Reminder tracking fields
  reminderSent24h: { type: Boolean, default: false },
  reminderSent12h: { type: Boolean, default: false },
  reminderSent1h: { type: Boolean, default: false },
  lastReminderSent: { type: Date },
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
