'use client';

import { useState, useCallback } from 'react';
import { FileText, Image, X, Upload, AlertCircle, CheckCircle, FileX } from 'lucide-react';

const FileUploadHandler = ({ 
  onFilesSelect, 
  maxFiles = 5, 
  maxSize = 15 * 1024 * 1024, // 15MB
  allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/dicom' // DICOM medical images
  ],
  showPreview = true,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [validationResults, setValidationResults] = useState([]);

  // File type mapping for better UI
  const fileTypeInfo = {
    'image/jpeg': { icon: Image, label: 'JPEG Image', color: 'text-blue-500' },
    'image/png': { icon: Image, label: 'PNG Image', color: 'text-blue-500' },
    'image/gif': { icon: Image, label: 'GIF Image', color: 'text-blue-500' },
    'image/webp': { icon: Image, label: 'WebP Image', color: 'text-blue-500' },
    'image/bmp': { icon: Image, label: 'BMP Image', color: 'text-blue-500' },
    'application/pdf': { icon: FileText, label: 'PDF Document', color: 'text-red-500' },
    'text/plain': { icon: FileText, label: 'Text File', color: 'text-gray-500' },
    'application/msword': { icon: FileText, label: 'Word Document', color: 'text-blue-600' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      icon: FileText, label: 'Word Document', color: 'text-blue-600'
    },
    'application/dicom': { icon: Image, label: 'DICOM Medical Image', color: 'text-purple-500' }
  };

  const validateFile = (file) => {
    const errors = [];
    const warnings = [];
    
    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)})`);
    }
    
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not supported`);
    }
    
    // Medical image specific validations
    if (file.type.startsWith('image/')) {
      // Check for medical keywords in filename
      const medicalKeywords = ['xray', 'ct', 'mri', 'ultrasound', 'scan', 'dicom'];
      const isMedicalImage = medicalKeywords.some(keyword => 
        file.name.toLowerCase().includes(keyword)
      );
      
      if (isMedicalImage) {
        warnings.push('Detected medical image - will use specialized analysis');
      }
      
      // Warn about very small images
      if (file.size < 10 * 1024) { // Less than 10KB
        warnings.push('Image file is very small - may affect analysis quality');
      }
    }
    
    // PDF specific validations
    if (file.type === 'application/pdf') {
      warnings.push('PDF documents will be processed for text content');
    }
    
    return {
      file,
      valid: errors.length === 0,
      errors,
      warnings,
      medicalType: detectMedicalType(file)
    };
  };

  const detectMedicalType = (file) => {
    const filename = file.name.toLowerCase();
    
    if (filename.includes('xray') || filename.includes('chest') || filename.includes('lung')) {
      return 'xray';
    }
    if (filename.includes('skin') || filename.includes('derma') || filename.includes('mole')) {
      return 'skin';
    }
    if (filename.includes('ct') || filename.includes('scan')) {
      return 'ct';
    }
    if (filename.includes('mri')) {
      return 'mri';
    }
    if (filename.includes('ultrasound') || filename.includes('echo')) {
      return 'ultrasound';
    }
    
    return file.type.startsWith('image/') ? 'general_image' : 'document';
  };

  const handleFiles = useCallback((files) => {
    const fileList = Array.from(files);
    
    if (fileList.length > maxFiles) {
      setUploadErrors([`Maximum ${maxFiles} files allowed. ${fileList.length} files selected.`]);
      return;
    }
    
    const results = fileList.map(validateFile);
    setValidationResults(results);
    
    const validFiles = results.filter(r => r.valid).map(r => r.file);
    const errors = results.filter(r => !r.valid).map(r => 
      `${r.file.name}: ${r.errors.join(', ')}`
    );
    
    if (errors.length > 0) {
      setUploadErrors(errors);
    } else {
      setUploadErrors([]);
    }
    
    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  }, [maxFiles, onFilesSelect]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType, medicalType) => {
    const info = fileTypeInfo[fileType] || { icon: FileText, color: 'text-gray-500' };
    const IconComponent = info.icon;
    
    return (
      <div className={`${info.color} relative`}>
        <IconComponent className=\"h-6 w-6\" />
        {medicalType && medicalType !== 'document' && medicalType !== 'general_image' && (
          <div className=\"absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full\" />
        )}
      </div>
    );
  };

  const clearErrors = () => {
    setUploadErrors([]);
    setValidationResults([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type=\"file\"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInput}
          className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer\"
        />
        
        <div className=\"space-y-2\">
          <Upload className={`mx-auto h-12 w-12 ${
            dragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
          
          <div>
            <p className=\"text-lg font-medium text-gray-900 dark:text-white\">
              {dragActive ? 'Drop files here' : 'Upload medical files'}
            </p>
            <p className=\"text-sm text-gray-500 dark:text-gray-400\">
              Click or drag files to upload
            </p>
          </div>
          
          <div className=\"text-xs text-gray-400 dark:text-gray-500 space-y-1\">
            <p>Supported: Images (JPG, PNG, GIF, WebP), PDFs, Word docs, DICOM</p>
            <p>Max {maxFiles} files, {formatFileSize(maxSize)} each</p>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {showPreview && validationResults.length > 0 && (
        <div className=\"space-y-3\">
          <div className=\"flex items-center justify-between\">
            <h4 className=\"font-medium text-gray-900 dark:text-white\">
              File Validation Results
            </h4>
            <button
              onClick={clearErrors}
              className=\"text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200\"
            >
              Clear
            </button>
          </div>
          
          {validationResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${
                result.valid
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              <div className=\"flex items-start space-x-3\">
                <div className=\"flex-shrink-0 mt-1\">
                  {result.valid ? (
                    <CheckCircle className=\"h-5 w-5 text-green-500\" />
                  ) : (
                    <FileX className=\"h-5 w-5 text-red-500\" />
                  )}
                </div>
                
                <div className=\"flex-1 min-w-0\">
                  <div className=\"flex items-center space-x-2\">
                    {getFileIcon(result.file.type, result.medicalType)}
                    <span className=\"font-medium text-gray-900 dark:text-white truncate\">
                      {result.file.name}
                    </span>
                    <span className=\"text-sm text-gray-500\">
                      ({formatFileSize(result.file.size)})
                    </span>
                  </div>
                  
                  {result.medicalType && result.medicalType !== 'document' && (
                    <div className=\"mt-1\">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        result.medicalType === 'xray' ? 'bg-purple-100 text-purple-800' :
                        result.medicalType === 'skin' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        Medical: {result.medicalType.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  
                  {result.errors.length > 0 && (
                    <div className=\"mt-2 space-y-1\">
                      {result.errors.map((error, errorIndex) => (
                        <div key={errorIndex} className=\"flex items-start space-x-1\">
                          <AlertCircle className=\"h-4 w-4 text-red-500 mt-0.5 flex-shrink-0\" />
                          <span className=\"text-sm text-red-700 dark:text-red-300\">{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {result.warnings.length > 0 && (
                    <div className=\"mt-2 space-y-1\">
                      {result.warnings.map((warning, warningIndex) => (
                        <div key={warningIndex} className=\"flex items-start space-x-1\">
                          <AlertCircle className=\"h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0\" />
                          <span className=\"text-sm text-yellow-700 dark:text-yellow-300\">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className=\"p-4 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 rounded-lg\">
          <div className=\"flex items-start space-x-2\">
            <AlertCircle className=\"h-5 w-5 text-red-500 mt-0.5 flex-shrink-0\" />
            <div className=\"space-y-1\">
              <h4 className=\"font-medium text-red-800 dark:text-red-200\">Upload Errors</h4>
              {uploadErrors.map((error, index) => (
                <p key={index} className=\"text-sm text-red-700 dark:text-red-300\">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className=\"text-xs text-gray-500 dark:text-gray-400 space-y-1\">
        <p><strong>Tips for better analysis:</strong></p>
        <ul className=\"list-disc list-inside space-y-0.5 ml-2\">
          <li>For X-rays: Include 'xray', 'chest', or 'lung' in filename</li>
          <li>For skin conditions: Include 'skin', 'mole', or 'derma' in filename</li>
          <li>Ensure images are clear and well-lit</li>
          <li>Higher resolution images provide better analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploadHandler;
