import mongoose from 'mongoose';

const MentalHealthSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mood: { 
    type: String, 
    required: true, 
    enum: ['Happy', 'Content', 'Neutral', 'Anxious', 'Sad', 'Stressed'] 
  },
  stressLevel: { type: Number, required: true },
  sleepHours: { type: Number, required: true },
  anxiety: { type: Number },
  depression: { type: Number },
  energyLevel: { type: Number },
  concentration: { type: Number },
  socialInteraction: { type: Number },
  selfEsteem: { type: Number },
  thoughts: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const MentalHealth = mongoose.models.MentalHealth || mongoose.model('MentalHealth', MentalHealthSchema);
export default MentalHealth;
