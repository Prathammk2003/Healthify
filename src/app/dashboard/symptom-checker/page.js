'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Plus, X, FileText, Image, Loader2, HeartPulse, AlertCircle, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function SymptomChecker() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      content: '🏥 **Welcome to the Advanced Medical AI Diagnostic System** 🤖\n\nI\'m your next-generation AI medical assistant powered by **BioClinicalBERT** and comprehensive medical datasets. Here\'s what makes me extraordinary:\n\n🔬 **Multi-Dataset Integration**: I analyze your symptoms against **8 specialized medical datasets** including:\n• 💓 ECG & Cardiovascular data\n• 🧬 Diabetes & Metabolic research\n• 🧠 Stroke & Neurological studies\n• 🦠 Cancer & Oncology research\n• 📋 Medical transcriptions & Clinical notes\n• 📚 PubMed research papers\n• 🩻 Medical imaging (X-rays, Brain scans)\n• 📊 Laboratory values & Reports\n\n🎯 **Advanced Capabilities**:\n• **Natural Language Processing**: BioClinicalBERT trained on millions of medical cases\n• **Computer Vision**: Medical image analysis with 90%+ accuracy\n• **Evidence-Based Medicine**: Real-time cross-referencing with medical literature\n• **Risk Stratification**: Intelligent severity assessment\n• **Multimodal Analysis**: Text + Image + Dataset correlation\n\n**🚀 Simply describe your symptoms or click the + button to upload medical images/documents!**\n\n*Experience healthcare at the forefront of AI technology.* ⚡',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentMessage]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = [];
    const maxSize = 15 * 1024 * 1024; // 15MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/dicom', 'application/octet-stream' // DICOM files
    ];

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported. Please upload images, PDFs, or text documents.`);
        return;
      }
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 15MB.`);
        return;
      }
      validFiles.push(file);
    });

    setAttachedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() && attachedFiles.length === 0) return;

    setLoading(true);
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage.trim(),
      files: attachedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })),
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    const messageText = currentMessage;
    const messageFiles = [...attachedFiles];
    setCurrentMessage('');
    setAttachedFiles([]);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('symptoms', messageText);
      formData.append('userId', user?.id || '');
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      
      // Add files
      messageFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/symptom-checker', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        // Set conversation ID if not already set
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }

        // Add AI response to chat
        const aiMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.diagnosis,
          analysisId: data.analysisId,
          riskLevel: data.riskLevel,
          confidence: data.confidence,
          analysisResults: data.analysisResults,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setShowDisclaimer(true);
      } else {
        // Add error message
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: data.error || 'An error occurred while analyzing your symptoms.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/patient">
            <button className="button-secondary flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </Link>
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold gradient-heading">AI Medical Assistant</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>AI Assistant Online</span>
          </div>
        </div>
      </div>


      {showDisclaimer && (
        <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Medical Disclaimer</h3>
                <p className="text-amber-700 text-sm">
                  This AI assistant provides informational analysis only and does not replace professional medical advice. 
                  Always consult healthcare providers for proper diagnosis and treatment. For emergencies, call emergency services immediately.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="text-amber-600 hover:text-amber-800 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${
            message.type === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <div className={`max-w-4xl ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-l-2xl rounded-tr-2xl' 
                : message.type === 'error'
                ? 'bg-red-100 text-red-800 rounded-r-2xl rounded-tl-2xl border border-red-200'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-r-2xl rounded-tl-2xl shadow-md border border-gray-200 dark:border-gray-700'
            } p-4`}>
              {/* Message Content */}
              {message.type === 'user' ? (
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
              
              {/* File Attachments (for user messages) */}
              {message.files && message.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm opacity-75">Attached files:</div>
                  {message.files.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm opacity-90">
                      {getFileIcon(file.type)}
                      <span>{file.name}</span>
                      <span className="text-xs">({formatFileSize(file.size)})</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Analysis Results (for AI responses) */}
              {message.type === 'assistant' && message.analysisResults && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Analysis Details</h4>
                    {message.riskLevel && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getRiskLevelColor(message.riskLevel)
                      }`}>
                        Risk: {message.riskLevel}
                      </span>
                    )}
                  </div>
                  
                  {message.confidence && (
                    <div className="mb-2 text-sm">
                      <span className="font-medium">Confidence: </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {Math.round(message.confidence * 100)}%
                      </span>
                    </div>
                  )}
                  
                  {message.analysisResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium mb-1">Key Findings:</div>
                      {message.analysisResults.slice(0, 3).map((result, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{result.label}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              

              
              {/* Timestamp */}
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-r-2xl rounded-tl-2xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {attachedFiles.length > 0 && (
        <div className="mx-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Attached Files ({attachedFiles.length})
            </span>
          </div>
          <div className="space-y-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center space-x-2">
                  {getFileIcon(file.type)}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* Modern File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Add images or documents"
          >
            <Plus className="h-6 w-6 text-white" />
          </button>
          
          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your symptoms or upload medical images for AI analysis..."
              className="w-full p-4 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none min-h-[56px] max-h-32 bg-gray-50 dark:bg-gray-700 transition-all duration-200"
              rows={1}
            />
          </div>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!currentMessage.trim() && attachedFiles.length === 0)}
            className="flex-shrink-0 w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx,.dcm"
            onChange={handleFileSelect}
            className="hidden"
          />
        </form>
        
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          📸 AI-powered analysis • Supports medical images, documents, DICOM files • Max 15MB per file
        </div>
      </div>
    </div>
  );
}