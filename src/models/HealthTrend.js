import mongoose from 'mongoose';

const TrendDataPointSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  value: { type: Number, required: true },
  source: {
    type: String,
    enum: ['mental_health', 'symptom_checker', 'medication', 'appointment', 'analysis', 'manual'],
    required: true
  },
  context: mongoose.Schema.Types.Mixed // Additional context data
});

const HealthTrendSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  metricName: {
    type: String,
    required: true,
    enum: [
      'stress_level',
      'anxiety_level',
      'depression_score',
      'sleep_quality',
      'energy_level',
      'mood_score',
      'medication_adherence',
      'appointment_frequency',
      'symptom_severity',
      'overall_wellbeing',
      'social_interaction',
      'self_esteem',
      'concentration_level'
    ]
  },
  category: {
    type: String,
    enum: ['mental_health', 'physical_health', 'lifestyle', 'medication', 'social'],
    required: true
  },
  timeframe: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'daily'
  },
  dataPoints: [TrendDataPointSchema],
  // Statistical analysis
  analytics: {
    currentValue: Number,
    averageValue: Number,
    medianValue: Number,
    minValue: Number,
    maxValue: Number,
    standardDeviation: Number,
    trendDirection: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'volatile']
    },
    trendStrength: {
      type: Number,
      min: 0,
      max: 1 // 0 = no trend, 1 = strong trend
    },
    volatility: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    lastSignificantChange: Date,
    changePercentage: Number // % change from first to last measurement
  },
  // Predictive insights
  predictions: {
    nextValue: Number,
    confidence: Number,
    timeToTarget: String, // e.g., "2 weeks to reach normal range"
    riskOfDeterioration: Number // 0-1 probability
  },
  // Correlations with other metrics
  correlations: [{
    metricName: String,
    correlationCoefficient: Number, // -1 to 1
    strength: {
      type: String,
      enum: ['weak', 'moderate', 'strong']
    },
    significance: Boolean
  }],
  // Pattern detection
  patterns: [{
    type: {
      type: String,
      enum: ['seasonal', 'cyclical', 'trigger_based', 'medication_related', 'stress_related']
    },
    description: String,
    confidence: Number,
    frequency: String,
    triggers: [String]
  }],
  // Target ranges and goals
  targets: {
    idealRange: {
      min: Number,
      max: Number
    },
    warningThresholds: {
      lower: Number,
      upper: Number
    },
    criticalThresholds: {
      lower: Number,
      upper: Number
    },
    personalGoal: Number,
    timeToReachGoal: String
  },
  // Data quality metrics
  dataQuality: {
    completeness: Number, // % of expected data points present
    consistency: Number, // How consistent the measurements are
    lastDataPoint: Date,
    gapAnalysis: {
      longestGap: Number, // Days
      averageGap: Number,
      totalGaps: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
HealthTrendSchema.index({ userId: 1, metricName: 1 });
HealthTrendSchema.index({ category: 1 });
HealthTrendSchema.index({ 'dataPoints.timestamp': -1 });
HealthTrendSchema.index({ lastCalculated: 1 });

// Virtual for trend status
HealthTrendSchema.virtual('trendStatus').get(function() {
  const current = this.analytics.currentValue;
  const targets = this.targets;
  
  if (!current || !targets) return 'unknown';
  
  if (current <= targets.criticalThresholds?.lower || current >= targets.criticalThresholds?.upper) {
    return 'critical';
  }
  if (current <= targets.warningThresholds?.lower || current >= targets.warningThresholds?.upper) {
    return 'warning';
  }
  if (current >= targets.idealRange?.min && current <= targets.idealRange?.max) {
    return 'optimal';
  }
  return 'suboptimal';
});

// Virtual for data freshness
HealthTrendSchema.virtual('dataFreshness').get(function() {
  if (!this.dataQuality.lastDataPoint) return 'no_data';
  
  const daysSinceLastData = (new Date() - this.dataQuality.lastDataPoint) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastData <= 1) return 'fresh';
  if (daysSinceLastData <= 3) return 'recent';
  if (daysSinceLastData <= 7) return 'stale';
  return 'outdated';
});

// Static method to get user trends by category
HealthTrendSchema.statics.getUserTrendsByCategory = function(userId, category) {
  return this.find({ 
    userId, 
    category,
    isActive: true 
  }).sort({ metricName: 1 });
};

// Static method to get trends needing attention
HealthTrendSchema.statics.getTrendsNeedingAttention = function(userId) {
  return this.find({
    userId,
    isActive: true,
    $or: [
      { 'analytics.trendDirection': 'declining' },
      { 'analytics.volatility': 'high' },
      { 'predictions.riskOfDeterioration': { $gte: 0.7 } }
    ]
  });
};

// Instance method to add data point
HealthTrendSchema.methods.addDataPoint = function(value, source, context = {}) {
  this.dataPoints.push({
    timestamp: new Date(),
    value,
    source,
    context
  });
  
  // Keep only last 365 data points for daily metrics
  if (this.timeframe === 'daily' && this.dataPoints.length > 365) {
    this.dataPoints = this.dataPoints.slice(-365);
  }
  
  return this.save();
};

// Instance method to calculate analytics
HealthTrendSchema.methods.calculateAnalytics = function() {
  if (this.dataPoints.length === 0) return this;
  
  const values = this.dataPoints.map(dp => dp.value);
  const n = values.length;
  
  // Basic statistics
  this.analytics.currentValue = values[n - 1];
  this.analytics.averageValue = values.reduce((a, b) => a + b, 0) / n;
  this.analytics.minValue = Math.min(...values);
  this.analytics.maxValue = Math.max(...values);
  
  // Median
  const sorted = [...values].sort((a, b) => a - b);
  this.analytics.medianValue = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  // Standard deviation
  const variance = values.reduce((acc, val) => acc + Math.pow(val - this.analytics.averageValue, 2), 0) / n;
  this.analytics.standardDeviation = Math.sqrt(variance);
  
  // Trend direction (simple linear regression)
  if (n >= 2) {
    const firstValue = values[0];
    const lastValue = values[n - 1];
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;
    this.analytics.changePercentage = changePercent;
    
    if (Math.abs(changePercent) < 5) {
      this.analytics.trendDirection = 'stable';
    } else if (changePercent > 0) {
      this.analytics.trendDirection = 'improving';
    } else {
      this.analytics.trendDirection = 'declining';
    }
    
    // Trend strength (correlation coefficient approximation)
    this.analytics.trendStrength = Math.min(Math.abs(changePercent) / 50, 1);
  }
  
  // Volatility
  const cv = this.analytics.standardDeviation / this.analytics.averageValue;
  if (cv < 0.1) {
    this.analytics.volatility = 'low';
  } else if (cv < 0.3) {
    this.analytics.volatility = 'moderate';
  } else {
    this.analytics.volatility = 'high';
  }
  
  this.lastCalculated = new Date();
  return this;
};

export default mongoose.models.HealthTrend || mongoose.model('HealthTrend', HealthTrendSchema);