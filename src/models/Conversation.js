import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'assistant', 'system', 'error'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // File attachments for user messages
  attachments: [{
    fileName: String,
    fileType: String,
    fileSize: Number,
    analysisType: String // 'xray', 'skin', 'document', etc.
  }],
  // Analysis results for assistant messages
  analysisData: {
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisResult'
    },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    confidence: Number,
    conditions: [{
      label: String,
      confidence: Number,
      source: String // filename or 'text'
    }],
    aiModel: String,
    processingTime: Number // in milliseconds
  },
  // Token usage for cost tracking (if using paid APIs)
  tokenUsage: {
    input: Number,
    output: Number,
    total: Number
  }
}, { _id: true });

const ConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: function() {
      const date = new Date().toLocaleDateString();
      return `Symptom Check - ${date}`;
    }
  },
  messages: [MessageSchema],
  
  // Conversation metadata
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Summary generated from the conversation
  summary: {
    primarySymptoms: [String],
    suggestedConditions: [String],
    riskAssessment: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    recommendationsGiven: [String],
    filesAnalyzed: Number,
    totalMessages: Number
  },
  
  // Analytics and metrics
  analytics: {
    avgResponseTime: Number,
    totalAnalysisTime: Number,
    modelsUsed: [String],
    accuracyFeedback: {
      helpful: Boolean,
      accurate: Boolean,
      comments: String,
      rating: {
        type: Number,
        min: 1,
        max: 5
      }
    }
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    enum: [
      'respiratory', 'cardiovascular', 'neurological', 'gastrointestinal',
      'musculoskeletal', 'dermatological', 'mental-health', 'urgent', 
      'routine', 'follow-up', 'emergency', 'multimodal', 'text-only'
    ]
  }],
  
  // Related medical records or appointments (if applicable)
  relatedRecords: {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    doctorConsulted: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    followUpRequired: Boolean,
    actualDiagnosis: String, // For accuracy tracking
    outcomeNotes: String
  }
}, {
  timestamps: true,
  // Create indexes for better query performance
  indexes: [
    { userId: 1, createdAt: -1 },
    { 'messages.timestamp': -1 },
    { tags: 1 },
    { status: 1 },
    { 'summary.riskAssessment': 1 }
  ]
});

// Virtual for message count
ConversationSchema.virtual('messageCount').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Virtual for last activity
ConversationSchema.virtual('lastActivity').get(function() {
  if (this.messages && this.messages.length > 0) {
    return this.messages[this.messages.length - 1].timestamp;
  }
  return this.updatedAt;
});

// Method to add a message to the conversation
ConversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.summary.totalMessages = this.messages.length;
  return this.save();
};

// Method to generate conversation summary
ConversationSchema.methods.generateSummary = function() {
  const userMessages = this.messages.filter(m => m.type === 'user');
  const assistantMessages = this.messages.filter(m => m.type === 'assistant');
  
  // Extract symptoms from user messages
  const symptoms = [];
  const conditions = [];
  const recommendations = [];
  let highestRisk = 'low';
  let filesCount = 0;
  
  userMessages.forEach(msg => {
    if (msg.attachments) {
      filesCount += msg.attachments.length;
    }
  });
  
  assistantMessages.forEach(msg => {
    if (msg.analysisData) {
      if (msg.analysisData.riskLevel) {
        if (msg.analysisData.riskLevel === 'high') highestRisk = 'high';
        else if (msg.analysisData.riskLevel === 'moderate' && highestRisk !== 'high') {
          highestRisk = 'moderate';
        }
      }
      
      if (msg.analysisData.conditions) {
        msg.analysisData.conditions.forEach(condition => {
          if (!conditions.includes(condition.label)) {
            conditions.push(condition.label);
          }
        });
      }
    }
    
    // Extract recommendations from content
    if (msg.content.includes('Recommendations:') || msg.content.includes('**Recommendations:**')) {
      const recSection = msg.content.split(/Recommendations?:/)[1];
      if (recSection) {
        const lines = recSection.split('\n').slice(0, 3); // First 3 recommendations
        lines.forEach(line => {
          const clean = line.replace(/[•\\-*]/g, '').trim();
          if (clean && !recommendations.includes(clean)) {
            recommendations.push(clean);
          }
        });
      }
    }
  });
  
  this.summary = {
    primarySymptoms: symptoms.slice(0, 5),
    suggestedConditions: conditions.slice(0, 5),
    riskAssessment: highestRisk,
    recommendationsGiven: recommendations.slice(0, 5),
    filesAnalyzed: filesCount,
    totalMessages: this.messages.length
  };
  
  return this.save();
};

// Method to get conversation for specific user
ConversationSchema.statics.getByUser = function(userId, limit = 10, status = 'active') {
  return this.find({ userId, status })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('title summary createdAt updatedAt messageCount lastActivity tags');
};

// Method to get conversations by risk level
ConversationSchema.statics.getByRiskLevel = function(riskLevel, limit = 50) {
  return this.find({ 'summary.riskAssessment': riskLevel, status: 'active' })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .select('userId title summary createdAt');
};

// Pre-save middleware to auto-generate tags
ConversationSchema.pre('save', function(next) {
  if (this.isModified('messages') || this.isNew) {
    const tags = new Set();
    
    // Analyze content for medical categories
    const allContent = this.messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (/cough|breathe|lung|chest|respiratory/i.test(allContent)) tags.add('respiratory');
    if (/heart|chest pain|cardiac|blood pressure/i.test(allContent)) tags.add('cardiovascular');
    if (/headache|dizzy|neurolog|brain|nerve/i.test(allContent)) tags.add('neurological');
    if (/stomach|nausea|digest|bowel|abdomen/i.test(allContent)) tags.add('gastrointestinal');
    if (/muscle|joint|bone|back|pain/i.test(allContent)) tags.add('musculoskeletal');
    if (/skin|rash|itch|mole|dermat/i.test(allContent)) tags.add('dermatological');
    if (/anxiety|depress|mental|mood|stress/i.test(allContent)) tags.add('mental-health');
    
    // Risk-based tags
    if (this.summary?.riskAssessment === 'high') tags.add('urgent');
    else if (this.summary?.riskAssessment === 'moderate') tags.add('routine');
    
    // Type-based tags
    if (this.summary?.filesAnalyzed > 0) tags.add('multimodal');
    else tags.add('text-only');
    
    this.tags = Array.from(tags);
  }
  next();
});

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
export default Conversation;
