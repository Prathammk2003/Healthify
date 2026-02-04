import mongoose from 'mongoose';

const FindingSchema = new mongoose.Schema({
  label: { type: String, required: true },
  confidence: { type: Number, required: true }
}, { _id: false });

const AnalysisResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['xray', 'skin', 'multimodal', 'text'], required: true },
  inputs: {
    hasText: { type: Boolean, default: false },
    hasImage: { type: Boolean, default: false }
  },
  provider: { type: String, default: 'hf' },
  modelIds: {
    text: { type: String },
    image: { type: String },
    explainer: { type: String }
  },
  summary: { type: String },
  report: { type: String },
  risk: { type: String, enum: ['low', 'moderate', 'high'] },
  conditions: { type: [FindingSchema], default: [] },
  stage1: {
    textTop: { type: [FindingSchema], default: [] },
    imageTop: { type: [FindingSchema], default: [] }
  }
}, { timestamps: true });

const AnalysisResult = mongoose.models.AnalysisResult || mongoose.model('AnalysisResult', AnalysisResultSchema);
export default AnalysisResult;


