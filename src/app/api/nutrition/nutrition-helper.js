/**
 * Helper functions for the nutrition API
 */

import { regionalCuisines, healthConditionRecommendations } from './nutrition-data.js';

/**
 * Gets regional cuisine data based on preference and dietary restriction
 * @param {string} regionalPreference - The regional cuisine preference
 * @param {string} dietaryPreference - The dietary preference (vegetarian, vegan, balanced, etc.)
 * @returns {Object} The filtered cuisine data
 */
export function getRegionalCuisine(regionalPreference, dietaryPreference = 'balanced') {
  const cuisine = regionalCuisines[regionalPreference] || regionalCuisines['general'];

  // Determine which dietary category to use
  let dietCategory = 'all';

  if (dietaryPreference === 'vegan') {
    dietCategory = 'vegan';
  } else if (dietaryPreference === 'vegetarian') {
    dietCategory = 'vegetarian';
  } else if (dietaryPreference === 'balanced' || dietaryPreference === 'keto' || dietaryPreference === 'paleo' || dietaryPreference === 'mediterranean') {
    // For balanced, keto, paleo, and mediterranean, use non-veg options if available, otherwise all
    dietCategory = 'nonVeg';
  }

  // Build the filtered cuisine object
  const filteredCuisine = {
    breakfast: cuisine.breakfast[dietCategory] || cuisine.breakfast.all || [],
    lunch: cuisine.lunch[dietCategory] || cuisine.lunch.all || [],
    dinner: cuisine.dinner[dietCategory] || cuisine.dinner.all || [],
    snacks: cuisine.snacks[dietCategory] || cuisine.snacks.all || []
  };

  return filteredCuisine;
}

/**
 * Gets health condition specific recommendations
 * @param {string[]} healthConditions - Array of health conditions
 * @returns {Object} Combined recommendations for all conditions
 */
export function getHealthConditionRecommendations(healthConditions) {
  if (!healthConditions || healthConditions.length === 0) {
    return {
      avoid: [],
      include: [],
      tips: []
    };
  }

  const combined = {
    avoid: [],
    include: [],
    tips: []
  };

  healthConditions.forEach(condition => {
    const recommendations = healthConditionRecommendations[condition];
    if (recommendations) {
      combined.avoid.push(...recommendations.avoid);
      combined.include.push(...recommendations.include);
      combined.tips.push(...recommendations.tips);
    }
  });

  // Remove duplicates
  combined.avoid = [...new Set(combined.avoid)];
  combined.include = [...new Set(combined.include)];
  combined.tips = [...new Set(combined.tips)];

  return combined;
}

/**
 * Calculates BMI and related metrics
 * @param {Object} userData - User data including height, weight, etc.
 * @returns {Object} BMI and related metrics
 */
export function calculateBasicMetrics(userData) {
  const heightInMeters = userData.height / 100;
  const bmi = +(userData.weight / (heightInMeters * heightInMeters)).toFixed(2);

  // Determine BMI category
  let bmiCategory = '';
  if (bmi < 18.5) bmiCategory = 'underweight';
  else if (bmi >= 18.5 && bmi < 25) bmiCategory = 'normal';
  else if (bmi >= 25 && bmi < 30) bmiCategory = 'overweight';
  else bmiCategory = 'obese';

  return { bmi, bmiCategory };
}

/**
 * Generates supplement recommendations
 * @param {Object} userData - User data including age, diet preferences, etc.
 * @returns {string[]} Array of supplement recommendations
 */
export function generateSupplementRecommendations(userData) {
  const recommendations = [];

  // Age-based recommendations
  if (userData.age > 50) {
    recommendations.push('Vitamin D3 (1000-2000 IU daily)');
    recommendations.push('Calcium (1000-1200 mg daily)');
    recommendations.push('Vitamin B12 (2.4 mcg daily)');
  }

  // Diet-based recommendations
  if (userData.dietaryPreference === 'vegan') {
    recommendations.push('Vitamin B12 (25-100 mcg daily)');
    recommendations.push('Omega-3 fatty acids from algae oil (250-500 mg DHA daily)');
    recommendations.push('Iron (18 mg daily for women, 8 mg for men)');
    recommendations.push('Zinc (8-11 mg daily)');
    recommendations.push('Iodine (150 mcg daily)');
  } else if (userData.dietaryPreference === 'vegetarian') {
    recommendations.push('Vitamin B12 (2.4-100 mcg daily)');
    recommendations.push('Iron (18 mg daily for women, 8 mg for men)');
    recommendations.push('Zinc (8-11 mg daily)');
  }

  // Activity-based recommendations
  if (userData.activityLevel === 'veryActive' || userData.activityLevel === 'extraActive') {
    recommendations.push('Electrolyte supplements for intense workouts');
    recommendations.push('Branch chain amino acids (BCAAs) for recovery');
    recommendations.push('Magnesium (300-400 mg daily) for muscle recovery');
  }

  // Health condition based recommendations
  if (userData.healthConditions) {
    if (userData.healthConditions.includes('diabetes')) {
      recommendations.push('Chromium picolinate (200-1000 mcg daily) for blood sugar management');
      recommendations.push('Alpha-lipoic acid (300-600 mg daily) for nerve health');
    }

    if (userData.healthConditions.includes('heartDisease') || userData.healthConditions.includes('highCholesterol')) {
      recommendations.push('Omega-3 fatty acids (1-3g EPA+DHA daily) for cardiovascular health');
      recommendations.push('Coenzyme Q10 (100-200 mg daily) for heart health');
    }

    if (userData.healthConditions.includes('hypertension')) {
      recommendations.push('Magnesium (300-400 mg daily) for blood pressure support');
      recommendations.push('Potassium-rich foods or supplements (consult doctor first)');
    }
  }

  return recommendations;
}