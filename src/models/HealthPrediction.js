import mongoose from 'mongoose';

const HealthPredictionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  predictionType: {
    type: String,
    enum: [
      'mental_health_risk',
      'medication_adherence',
      'health_deterioration',
      'emergency_risk',
      'symptom_progression',
      'recovery_timeline'
    ],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  predictionData: {
    // Flexible object to store prediction-specific data
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  factors: [{
    name: String,
    weight: Number,
    impact: String, // 'positive', 'negative', 'neutral'
    description: String
  }],
  timeframe: {
    type: String,
    enum: ['1_day', '3_days', '1_week', '2_weeks', '1_month', '3_months'],
    required: true
  },
  actualOutcome: {
    type: String,
    enum: ['accurate', 'partially_accurate', 'inaccurate', 'pending'],
    default: 'pending'
  },
  recommendations: [{
    category: String,
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    estimatedImpact: Number
  }],
  dataSource: {
    mentalHealthEntries: Number,
    symptomChecks: Number,
    medicationData: Number,
    appointmentHistory: Number
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
HealthPredictionSchema.index({ userId: 1, predictionType: 1 });
HealthPredictionSchema.index({ validUntil: 1 });
HealthPredictionSchema.index({ riskScore: -1 });
HealthPredictionSchema.index({ createdAt: -1 });

// Virtual for checking if prediction is expired
HealthPredictionSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for time remaining
HealthPredictionSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.validUntil - now;
  return remaining > 0 ? remaining : 0;
});

// Static method to get active predictions for user
HealthPredictionSchema.statics.getActivePredictions = function(userId, predictionType = null) {
  const query = {
    userId,
    isActive: true,
    validUntil: { $gt: new Date() }
  };
  
  if (predictionType) {
    query.predictionType = predictionType;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Instance method to mark prediction outcome
HealthPredictionSchema.methods.markOutcome = function(outcome, notes = null) {
  this.actualOutcome = outcome;
  if (notes) {
    this.predictionData.outcomeNotes = notes;
  }
  return this.save();
};

export default mongoose.models.HealthPrediction || mongoose.model('HealthPrediction', HealthPredictionSchema);