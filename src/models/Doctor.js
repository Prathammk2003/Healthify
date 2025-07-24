import mongoose from 'mongoose';
import { DOCTOR_SPECIALIZATIONS } from '../constants/specializations.mjs';

// Define available specializations using imported constant
const SPECIALIZATIONS = DOCTOR_SPECIALIZATIONS;

const DoctorSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid ObjectId!`
    }
  },
  patients: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UserProfile',
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: props => `${props.value} is not a valid ObjectId!`
    }
  }],
  specialization: { 
    type: String, 
    enum: SPECIALIZATIONS,
    default: 'General Physician'
  },
  secondarySpecializations: [{
    type: String,
    enum: SPECIALIZATIONS
  }],
  qualifications: {
    type: String,
    default: ''
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
    default: 0
  },
  bio: {
    type: String,
    default: ''
  },
  availability: [{
    day: { type: String },
    startTime: { type: String },
    endTime: { type: String }
  }]
}, { timestamps: true });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);

// Export the specializations list so it can be used elsewhere
export const DoctorSpecializations = SPECIALIZATIONS;

export default Doctor;