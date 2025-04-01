import mongoose from 'mongoose';

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
  specialization: { type: String },
  availability: [{
    day: { type: String },
    startTime: { type: String },
    endTime: { type: String }
  }]
}, { timestamps: true });

const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
export default Doctor;