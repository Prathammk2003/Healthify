import mongoose from 'mongoose';

const PhysicalFitnessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseHours: { type: Number, required: true },
  calories: { type: Number, required: true },
  sleepHours: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const PhysicalFitness = mongoose.models.PhysicalFitness || mongoose.model('PhysicalFitness', PhysicalFitnessSchema);
export default PhysicalFitness;