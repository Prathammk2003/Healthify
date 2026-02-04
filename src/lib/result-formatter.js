/**
 * Result Formatter - Standardize model output into patient-friendly structured results
 */

/**
 * Format model output into structured JSON with patient-friendly summaries
 * @param {Object} rawResult - Raw model output
 * @returns {Object} Structured result with prediction, confidence, risk, summaries
 */
export function formatResult(rawResult) {
  // Extract label and confidence from raw result
  let label = 'unknown';
  let confidence = 0.5; // Default confidence
  
  // Handle different result formats
  if (rawResult && typeof rawResult === 'object') {
    if (rawResult.label) {
      label = rawResult.label;
    } else if (rawResult.findings && rawResult.findings.length > 0) {
      // Get the top finding
      label = rawResult.findings[0].label.toLowerCase().replace(/\s+/g, '_');
      confidence = rawResult.findings[0].confidence;
    } else if (rawResult.prediction) {
      label = rawResult.prediction.toLowerCase().replace(/\s+/g, '_');
      confidence = rawResult.confidence || confidence;
    }
  }
  
  // Convert confidence to percentage
  const confPercent = typeof confidence === 'number' ? 
    (confidence * 100).toFixed(2) : 
    parseFloat(confidence) || 0;
  
  // Risk assessment based on confidence
  let risk = "Low";
  if (confPercent > 75) {
    risk = "High";
  } else if (confPercent > 50) {
    risk = "Moderate";
  }
  
  // Patient-friendly summaries
  const patientSummaryMap = {
    'tumor_probability': "Possible tumor detected. Please consult a specialist.",
    'tumor': "Possible tumor detected. Please consult a specialist.",
    'cancer_probability': "Abnormal tissue signs found. Further tests recommended.",
    'cancer': "Abnormal tissue signs found. Further tests recommended.",
    'arrhythmia': "Irregular heart rhythm detected. Cardiologist review may be needed.",
    'tachycardia': "Fast heart rate detected. Cardiologist review may be needed.",
    'bradycardia': "Slow heart rate detected. Cardiologist review may be needed.",
    'diabetes_risk': "Elevated diabetes risk detected. Consider lifestyle changes.",
    'diabetes': "Elevated diabetes risk detected. Consider lifestyle changes.",
    'stroke_risk': "Increased stroke risk identified. Preventive care is advised.",
    'stroke': "Increased stroke risk identified. Preventive care is advised.",
    'heart_disease_risk': "Signs of possible heart disease. Cardiology evaluation suggested.",
    'heart_disease': "Signs of possible heart disease. Cardiology evaluation suggested.",
    'normal_probability': "No significant abnormality detected. Continue routine monitoring.",
    'normal': "No significant abnormality detected. Continue routine monitoring.",
    'no': "No significant abnormality detected. Continue routine monitoring.",
    'high': "High risk detected. Immediate medical attention recommended.",
    'moderate': "Moderate risk detected. Medical consultation advised.",
    'low': "Low risk. Continue routine monitoring."
  };
  
  // Try to find a matching summary
  const patientSummary = patientSummaryMap[label] || 
    patientSummaryMap[label.replace(/_/g, ' ')] ||
    "Analysis complete. No critical findings.";
  
  // Clinical note for doctors
  const clinicalNote = `Model indicates "${label.replace(/_/g, ' ')}" with confidence ${confPercent}%. Risk: ${risk}.`;
  
  return {
    prediction: label.replace(/_/g, ' '),
    confidence: confPercent + "%",
    risk,
    patientSummary,
    clinicalNote
  };
}

/**
 * Format medical analysis results into structured output
 * @param {Object} analysisResults - Results from medical analysis pipeline
 * @returns {Object} Structured result with all required fields
 */
export function formatMedicalAnalysis(analysisResults) {
  // Handle case where we have properly formatted results already
  if (analysisResults.prediction && analysisResults.confidence) {
    return {
      prediction: analysisResults.prediction,
      confidence: analysisResults.confidence,
      risk: analysisResults.risk || "Low",
      patientSummary: analysisResults.patientSummary || "Analysis complete.",
      clinicalNote: analysisResults.clinicalNote || "No additional notes."
    };
  }
  
  // Handle case where we have findings from rule-based analysis
  if (analysisResults.findings && analysisResults.findings.length > 0) {
    // Get the primary finding (highest confidence)
    const primaryFinding = analysisResults.findings
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    
    // Create raw result object for formatting
    const rawResult = {
      label: (primaryFinding.label || 'analysis').toLowerCase().replace(/\s+/g, '_'),
      confidence: primaryFinding.confidence || 0.5
    };
    
    // Use the standard formatter
    return formatResult(rawResult);
  }
  
  // Handle risk-based results
  if (analysisResults.risk) {
    const rawResult = {
      label: analysisResults.risk,
      confidence: analysisResults.risk === 'high' ? 0.9 : 
                 analysisResults.risk === 'moderate' ? 0.6 : 0.2
    };
    return formatResult(rawResult);
  }
  
  // Default fallback
  return {
    prediction: "analysis complete",
    confidence: "50.00%",
    risk: "Low",
    patientSummary: "Analysis complete. No critical findings detected.",
    clinicalNote: "Analysis completed with no significant findings."
  };
}