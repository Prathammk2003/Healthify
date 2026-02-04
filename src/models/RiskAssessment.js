import mongoose from 'mongoose';

const RiskFactorSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'mental_health',
      'physical_health', 
      'lifestyle',
      'medication',
      'social',
      'environmental'
    ],
    required: true
  },
  name: String,
  value: Number,
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical']
  },
  trend: {
    type: String,
    enum: ['improving', 'stable', 'worsening']
  },
  lastUpdated: Date
});

const RiskAssessmentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  overallRiskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    required: true
  },
  assessmentType: {
    type: String,
    enum: ['comprehensive', 'mental_health', 'physical_health', 'emergency'],
    default: 'comprehensive'
  },
  riskFactors: [RiskFactorSchema],
  // Category-specific risk scores
  categoryScores: {
    mentalHealth: { type: Number, min: 0, max: 100 },
    physicalHealth: { type: Number, min: 0, max: 100 },
    lifestyle: { type: Number, min: 0, max: 100 },
    medication: { type: Number, min: 0, max: 100 },
    social: { type: Number, min: 0, max: 100 },
    environmental: { type: Number, min: 0, max: 100 }
  },
  alerts: [{
    type: {
      type: String,
      enum: ['immediate_attention', 'monitor_closely', 'schedule_checkup', 'lifestyle_change']
    },
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    actionRequired: Boolean,
    estimatedTimeframe: String
  }],
  recommendations: [{
    category: String,
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    estimatedImpact: Number, // Expected risk reduction percentage
    timeToImpact: String, // e.g., "1 week", "1 month"
    actionType: {
      type: String,
      enum: ['immediate', 'short_term', 'long_term', 'lifestyle']
    }
  }],
  dataSource: {
    mentalHealthEntries: Number,
    symptomReports: Number,
    medicationAdherence: Number,
    appointmentHistory: Number,
    vitalSigns: Number,
    analysisHistory: Number
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  nextAssessmentDue: Date,
  comparisonToPrevious: {
    scoreChange: Number,
    trend: {
      type: String,
      enum: ['improving', 'stable', 'worsening']
    },
    significantChanges: [String]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
RiskAssessmentSchema.index({ userId: 1, createdAt: -1 });
RiskAssessmentSchema.index({ overallRiskScore: -1 });
RiskAssessmentSchema.index({ riskLevel: 1 });
RiskAssessmentSchema.index({ nextAssessmentDue: 1 });

// Virtual for days until next assessment
RiskAssessmentSchema.virtual('daysUntilNextAssessment').get(function() {
  if (!this.nextAssessmentDue) return null;
  const diff = this.nextAssessmentDue - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for critical alerts count
RiskAssessmentSchema.virtual('criticalAlertsCount').get(function() {
  return this.alerts.filter(alert => alert.priority === 'critical').length;
});

// Static method to get latest assessment for user
RiskAssessmentSchema.statics.getLatestAssessment = function(userId, assessmentType = null) {
  const query = { userId };
  if (assessmentType) {
    query.assessmentType = assessmentType;
  }
  return this.findOne(query).sort({ createdAt: -1 });
};

// Static method to get risk trend for user
RiskAssessmentSchema.statics.getRiskTrend = function(userId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    userId,
    createdAt: { $gte: cutoffDate }
  }).sort({ createdAt: 1 }).select('overallRiskScore riskLevel createdAt');
};

// Instance method to generate summary
RiskAssessmentSchema.methods.getSummary = function() {
  return {
    overallRisk: {
      score: this.overallRiskScore,
      level: this.riskLevel
    },
    criticalAlerts: this.criticalAlertsCount,
    topRiskFactors: this.riskFactors
      .filter(f => f.severity === 'high' || f.severity === 'critical')
      .slice(0, 3),
    highPriorityRecommendations: this.recommendations
      .filter(r => r.priority === 'high' || r.priority === 'critical')
      .slice(0, 3)
  };
};

export default mongoose.models.RiskAssessment || mongoose.model('RiskAssessment', RiskAssessmentSchema);