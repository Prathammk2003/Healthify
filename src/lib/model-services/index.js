// Import all model services
import { predictDiabetes } from './diabetes.js';
import { predictStrokeRisk } from './stroke.js';
import { classifyBreastCancer } from './breast-cancer.js';
import { analyzeChestXray } from './chest-xray.js';
import { analyzeECG } from './ecg.js';

// Export all model services
export {
  predictDiabetes,
  predictStrokeRisk,
  classifyBreastCancer,
  analyzeChestXray,
  analyzeECG
};