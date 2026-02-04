/**
 * Postprocess raw ONNX model output into structured result
 * @param {string} label - predicted condition (e.g., "brain_tumor")
 * @param {Array<number>} logits - raw model probabilities
 * @returns {Object} structuredResult
 */
export function formatMedicalResult(label, logits = []) {
  // Confidence = highest probability from logits
  let confidence = logits.length ? Math.max(...logits) : 0.0;
  const confidencePct = (confidence * 100).toFixed(2) + "%";

  // Risk assessment
  let risk = "Low";
  if (confidence > 0.75) risk = "High";
  else if (confidence > 0.5) risk = "Moderate";

  // Patient-friendly summaries
  const patientSummaries = {
    brain_tumor: "Possible brain tumor detected. Please consult a neurologist for confirmation.",
    normal_brain: "Brain scan appears normal. No significant abnormalities detected.",
    glioma: "Possible glioma (brain tumor) detected. Immediate neurologist consultation recommended.",
    meningioma: "Possible meningioma (usually benign brain tumor) detected. Neurologist evaluation advised.",
    pituitary_tumor: "Possible pituitary tumor detected. Endocrinologist and neurologist consultation recommended.",
    breast_cancer: "Signs of breast tissue abnormality found. Follow-up imaging is recommended.",
    ecg: "Irregular heart rhythm detected. May require cardiology review.",
    diabetes: "High probability of diabetes based on test values. Lifestyle adjustments and medical follow-up are advised.",
    stroke: "Elevated stroke risk identified. Preventive measures strongly recommended.",
    heart_disease: "Indicators of heart disease detected. Cardiologist consultation advised.",
    normal: "No significant abnormalities detected. Continue routine monitoring.",
    tumor_probability: "Possible tumor detected. Please consult a specialist.",
    cancer_probability: "Abnormal tissue signs found. Further tests recommended.",
    arrhythmia: "Irregular heart rhythm detected. Cardiologist review may be needed.",
    tachycardia: "Fast heart rate detected. Cardiologist review may be needed.",
    bradycardia: "Slow heart rate detected. Cardiologist review may be needed.",
    diabetes_risk: "Elevated diabetes risk detected. Consider lifestyle changes.",
    stroke_risk: "Increased stroke risk identified. Preventive care is advised.",
    heart_disease_risk: "Signs of possible heart disease. Cardiology evaluation suggested.",
    normal_probability: "No significant abnormality detected. Continue routine monitoring.",
    no: "No significant abnormality detected. Continue routine monitoring."
  };

  const patientSummary =
    patientSummaries[label] || "Result unclear. Further clinical testing may be required.";

  // Clinical note (doctor-style)
  const clinicalNote = `Model indicates "${label}" with confidence ${confidencePct}. Risk level: ${risk}.`;

  return {
    prediction: label,
    confidence: confidencePct,
    risk,
    patientSummary,
    clinicalNote,
    raw: { label, logits }
  };
}

/**
 * Format rule-based analysis results into structured output
 * @param {Object} analysisResults - Results from rule-based analysis
 * @returns {Object} structuredResult
 */
export function formatRuleBasedResult(analysisResults) {
  // Extract the most relevant finding
  let label = "analysis complete";
  let confidence = 0.5; // Default confidence

  if (analysisResults.findings && analysisResults.findings.length > 0) {
    // Sort findings by confidence and take the top one
    const sortedFindings = analysisResults.findings.sort((a, b) =>
      (b.confidence || 0) - (a.confidence || 0)
    );
    const topFinding = sortedFindings[0];

    label = (topFinding.label || "analysis").toLowerCase().replace(/\s+/g, '_');
    confidence = topFinding.confidence || confidence;
  } else if (analysisResults.risk) {
    // Use risk level if available
    label = analysisResults.risk;
    confidence = analysisResults.risk === "high" ? 0.9 :
      analysisResults.risk === "moderate" ? 0.6 : 0.2;
  }

  const confidencePct = (confidence * 100).toFixed(2) + "%";

  // Risk assessment
  let risk = "Low";
  if (confidence > 0.75) risk = "High";
  else if (confidence > 0.5) risk = "Moderate";

  // Patient-friendly summaries
  const patientSummaries = {
    high: "High risk detected. Immediate medical attention recommended.",
    moderate: "Moderate risk detected. Medical consultation advised.",
    low: "Low risk. Continue routine monitoring.",
    diabetes_risk: "Elevated diabetes risk detected. Consider lifestyle changes.",
    stroke_risk: "Increased stroke risk identified. Preventive care is advised.",
    heart_disease_risk: "Signs of possible heart disease. Cardiology evaluation suggested.",
    glucose_level: "Blood glucose level analysis complete. Continue monitoring.",
    high_bp: "High blood pressure detected. Lifestyle changes recommended."
  };

  const patientSummary =
    patientSummaries[label] || "Analysis complete. No critical findings detected.";

  // Clinical note (doctor-style)
  const clinicalNote = `Rule-based analysis indicates "${label}" with confidence ${confidencePct}. Risk level: ${risk}.`;

  return {
    prediction: label.replace(/_/g, ' '),
    confidence: confidencePct,
    risk,
    patientSummary,
    clinicalNote,
    raw: { label, confidence, source: "rule-based" }
  };
}

/**
 * Universal formatter that handles both model-based and rule-based results
 * @param {Object} result - Raw result from any analysis method
 * @returns {Object} structuredResult
 */
export function formatUniversalResult(result) {
  // If result is already formatted, return as is
  if (result.prediction && result.confidence && result.risk && !result.findings) {
    return result;
  }

  // If we have findings array, use the top finding
  if (result.findings && Array.isArray(result.findings) && result.findings.length > 0) {
    const topFinding = result.findings[0];
    const label = (topFinding.label || "unknown").toLowerCase().replace(/\s+/g, '_');
    const confidence = topFinding.confidence || 0.5;
    const logits = result.findings.map(f => f.confidence);

    return formatMedicalResult(label, logits);
  }

  // If we have logits, it's a model-based result
  if (result.logits || (result.output && Array.isArray(result.output))) {
    const label = result.label || result.prediction || "unknown";
    const logits = result.logits || result.output || [];
    return formatMedicalResult(label, logits);
  }

  // Otherwise, it's likely a rule-based result
  return formatRuleBasedResult(result);
}