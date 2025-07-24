'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, ArrowLeft, Scale, Apple, Activity, Check, Info, Dumbbell } from 'lucide-react';
import Link from 'next/link';

export default function NutritionPlanner() {
  const { isAuthenticated, userId } = useAuth();
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: 'male',
    activityLevel: 'moderate',
    dietaryPreference: 'balanced',
    regionalPreference: 'general',
    healthConditions: [],
    weightGoal: 'maintain',
    gymRoutine: 'none',
    workoutFrequency: '0',
    proteinPreference: 'none',
    creatineUse: 'no',
    userId: ''
  });
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update userId when component mounts
  useState(() => {
    if (userId) {
      setFormData(prev => ({ ...prev, userId }));
    }
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, healthConditions: [...prev.healthConditions, value] };
      } else {
        return { ...prev, healthConditions: prev.healthConditions.filter(condition => condition !== value) };
      }
    });
  };

  const generateNutritionPlan = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.height || !formData.weight || !formData.age) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setNutritionPlan(data.nutritionPlan);
      } else {
        setError(data.error || 'Failed to generate nutrition plan');
      }
    } catch (error) {
      console.error("Error generating nutrition plan:", error);
      setError("An error occurred while generating your nutrition plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Please log in to access the nutrition planner</h1>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/patient">
          <button className="button-secondary flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </Link>
        <h1 className="text-3xl font-bold gradient-heading flex items-center">
          <Apple className="h-8 w-8 text-green-500 mr-3" />
          AI Nutrition & Diet Planner
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="glass-card space-y-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 px-2">
            <h2 className="text-2xl font-semibold gradient-heading">Your Health Profile</h2>
            <Scale className="h-6 w-6 text-blue-500" />
          </div>

          <form onSubmit={generateNutritionPlan} className="space-y-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label flex items-center">
                  Height (cm)*
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                  max="300"
                />
              </div>
              <div>
                <label className="form-label flex items-center">
                  Weight (kg)*
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                  max="500"
                />
              </div>
              <div>
                <label className="form-label flex items-center">
                  Age*
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Activity Level</label>
              <select
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="moderate">Moderate (light exercise/sports 1-3 days/week)</option>
                <option value="active">Active (moderate exercise/sports 3-5 days/week)</option>
                <option value="veryActive">Very Active (hard exercise/sports 6-7 days/week)</option>
                <option value="extraActive">Extra Active (very hard exercise & physical job)</option>
              </select>
            </div>

            {/* Gym Routine Section */}
            <div>
              <div className="flex items-center mb-3">
                <Dumbbell className="h-5 w-5 text-purple-500 mr-2" />
                <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">Gym & Supplements</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 mb-3">
                <div>
                  <label className="form-label">Gym Routine</label>
                  <select
                    name="gymRoutine"
                    value={formData.gymRoutine}
                    onChange={handleChange}
                    className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="none">No gym routine</option>
                    <option value="strength">Strength Training</option>
                    <option value="hypertrophy">Hypertrophy/Bodybuilding</option>
                    <option value="endurance">Endurance Training</option>
                    <option value="functional">Functional Fitness</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="powerlifting">Powerlifting</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Workout Frequency (days per week)</label>
                  <select
                    name="workoutFrequency"
                    value={formData.workoutFrequency}
                    onChange={handleChange}
                    className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="0">0 (No workouts)</option>
                    <option value="1-2">1-2 days</option>
                    <option value="3-4">3-4 days</option>
                    <option value="5-6">5-6 days</option>
                    <option value="7">Daily</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Protein Preference</label>
                  <select
                    name="proteinPreference"
                    value={formData.proteinPreference}
                    onChange={handleChange}
                    className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="none">No protein supplement</option>
                    <option value="whey">Whey Protein</option>
                    <option value="casein">Casein Protein</option>
                    <option value="plant">Plant-Based Protein</option>
                    <option value="egg">Egg Protein</option>
                    <option value="collagen">Collagen Protein</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Creatine Use</label>
                  <select
                    name="creatineUse"
                    value={formData.creatineUse}
                    onChange={handleChange}
                    className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="no">Not using creatine</option>
                    <option value="yes">Currently using creatine</option>
                    <option value="considering">Considering using creatine</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Dietary Preference</label>
                <select
                  value={formData.dietaryPreference}
                  onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="balanced">Balanced</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                  <option value="mediterranean">Mediterranean</option>
                </select>
              </div>

              <div>
                <label className="form-label">Regional Preference</label>
                <select
                  value={formData.regionalPreference}
                  onChange={(e) => setFormData({ ...formData, regionalPreference: e.target.value })}
                  className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="south-indian">South Indian</option>
                  <option value="north-indian">North Indian</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="east-asian">East Asian</option>
                  <option value="mexican">Mexican</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Weight Goal</label>
              <select
                value={formData.weightGoal}
                onChange={(e) => setFormData({ ...formData, weightGoal: e.target.value })}
                className="form-input shadow-sm border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              >
                <option value="maintain">Maintain Weight</option>
                <option value="lose">Lose Weight</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>

            <div>
              <label className="form-label block mb-2">Health Conditions (if any)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="diabetes"
                    value="diabetes"
                    checked={formData.healthConditions.includes('diabetes')}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="diabetes" className="text-sm">Diabetes</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hypertension"
                    value="hypertension"
                    checked={formData.healthConditions.includes('hypertension')}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="hypertension" className="text-sm">Hypertension</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="heartDisease"
                    value="heartDisease"
                    checked={formData.healthConditions.includes('heartDisease')}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="heartDisease" className="text-sm">Heart Disease</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="highCholesterol"
                    value="highCholesterol"
                    checked={formData.healthConditions.includes('highCholesterol')}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="highCholesterol" className="text-sm">High Cholesterol</label>
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
              <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Fill in your details to get a personalized AI-generated nutrition plan tailored to your needs.
              </p>
            </div>

            <button
              type="submit"
              className="w-full button-gradient py-3 px-6 rounded-lg font-medium transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Generating Your Plan...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Check className="h-5 w-5 mr-2" />
                  Generate Nutrition Plan
                </div>
              )}
            </button>
          </form>

          {error && (
            <div className="m-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Nutrition Plan Display */}
        <div>
          {loading ? (
            <div className="glass-card flex flex-col items-center justify-center min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
              <Loader2 className="animate-spin h-12 w-12 text-blue-500 mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Generating your personalized nutrition plan...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment as our AI analyzes your health data.</p>
            </div>
          ) : nutritionPlan ? (
            <div className="glass-card shadow-lg rounded-xl p-6">
              {/* Add diagnostic message when fallback is used */}
              {nutritionPlan.source === 'fallback' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className="font-semibold text-amber-700 dark:text-amber-400">Using Template-Based Plan</h3>
                      <p className="text-sm text-amber-600 dark:text-amber-300">
                        AI-generated personalized plans are temporarily unavailable. We're still providing you with a customized plan based on your data.
                      </p>
                      <details className="mt-2">
                        <summary className="text-xs font-medium text-amber-600 dark:text-amber-400 cursor-pointer">Technical details</summary>
                        <p className="text-xs mt-2 text-amber-700 dark:text-amber-300 font-mono whitespace-pre-wrap">
                          {nutritionPlan._debug?.diagnosticMessage || "No diagnostic information available."}
                        </p>
                      </details>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-semibold gradient-heading">{nutritionPlan.plan.title}</h2>
                <Activity className="h-6 w-6 text-green-500" />
              </div>

              <div className="overflow-auto max-h-[800px] p-4">
                <div className="bg-white/70 dark:bg-gray-800/70 p-6 rounded-lg shadow-inner">
                  {typeof nutritionPlan === 'string' ? (
                    // Handle old string format
                    nutritionPlan.split('\n').map((line, index) => {
                    // Handle headers (Summary)
                    if (line.includes('Nutrition Plan Summary:')) {
                      return (
                        <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
                          <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">
                            {line.replace(/\*\*/g, '')}
                          </h3>
                        </div>
                      );
                    }
                    // Handle other headers
                    else if (line.startsWith('**') && line.endsWith(':**')) {
                      return (
                        <h3 key={index} className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                          {line.replace(/\*\*/g, '')}
                        </h3>
                      );
                    }
                    // Handle BMI and calorie bullet points
                    else if (line.trim().startsWith('• BMI:') || line.trim().startsWith('• Daily Calorie')) {
                      return (
                        <div key={index} className="flex items-start my-1 pl-2">
                          <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                          <span className="font-medium">{line.substring(line.indexOf('•') + 1).trim()}</span>
                        </div>
                      );
                    }
                    // Handle regular bullet points
                    else if (line.trim().startsWith('•')) {
                      return (
                        <div key={index} className="flex items-start my-1 pl-2">
                          <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                          <span>{line.substring(line.indexOf('•') + 1).trim()}</span>
                        </div>
                      );
                    }
                    // Handle empty lines
                      else if (line.trim() === '') {
                      return <div key={index} className="h-2"></div>;
                    }
                      // Handle regular text
                    else {
                        return <p key={index} className="my-2">{line}</p>;
                      }
                    })
                  ) : (
                    // Handle new object format
                    <>
                      {/* Metrics Section */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
                        <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">
                          Nutrition Plan Summary:
                        </h3>
                        {nutritionPlan.metrics && (
                          <>
                            <div className="flex items-start my-1 pl-2">
                              <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                              <span className="font-medium">BMI: {nutritionPlan.metrics.bmi} - {nutritionPlan.metrics.bmiCategory}</span>
                            </div>
                            <div className="flex items-start my-1 pl-2">
                              <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                              <span className="font-medium">Daily Calories: {nutritionPlan.metrics.dailyCalories} kcal</span>
                            </div>
                            <div className="flex items-start my-1 pl-2">
                              <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                              <span className="font-medium">Protein: {nutritionPlan.metrics.proteinGrams}g ({nutritionPlan.metrics.proteinPercentage}%)</span>
                            </div>
                            <div className="flex items-start my-1 pl-2">
                              <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                              <span className="font-medium">Carbs: {nutritionPlan.metrics.carbGrams}g ({nutritionPlan.metrics.carbPercentage}%)</span>
                            </div>
                            <div className="flex items-start my-1 pl-2">
                              <span className="text-blue-600 dark:text-blue-400 mr-2 font-bold">•</span>
                              <span className="font-medium">Fat: {nutritionPlan.metrics.fatGrams}g ({nutritionPlan.metrics.fatPercentage}%)</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Plan Title */}
                      {nutritionPlan.plan && (
                        <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                          {nutritionPlan.plan.title}
                        </h3>
                      )}

                      {/* Description */}
                      {nutritionPlan.plan && nutritionPlan.plan.description && (
                        <p className="my-2">{nutritionPlan.plan.description}</p>
                      )}

                      {/* Meal Plan */}
                      {nutritionPlan.plan && nutritionPlan.plan.meals && (
                        <>
                          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                            Sample Daily Meal Plan:
                          </h3>
                          
                          {nutritionPlan.plan.meals.breakfast && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Breakfast</h4>
                              <div className="flex items-start my-1 pl-2">
                                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                <span>{nutritionPlan.plan.meals.breakfast}</span>
                              </div>
                            </>
                          )}
                          
                          {nutritionPlan.plan.meals.lunch && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Lunch</h4>
                              <div className="flex items-start my-1 pl-2">
                                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                <span>{nutritionPlan.plan.meals.lunch}</span>
                              </div>
                            </>
                          )}
                          
                          {nutritionPlan.plan.meals.dinner && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Dinner</h4>
                              <div className="flex items-start my-1 pl-2">
                                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                <span>{nutritionPlan.plan.meals.dinner}</span>
                              </div>
                            </>
                          )}
                          
                          {nutritionPlan.plan.meals.snacks && nutritionPlan.plan.meals.snacks.length > 0 && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Snacks</h4>
                              {nutritionPlan.plan.meals.snacks.map((snack, index) => (
                                <div key={index} className="flex items-start my-1 pl-2">
                                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                  <span>{snack}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      {/* Recommendations */}
                      {nutritionPlan.plan && nutritionPlan.plan.recommendations && (
                        <>
                          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                            Recommendations:
                          </h3>
                          {nutritionPlan.plan.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start my-1 pl-2">
                              <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Workout Plan */}
                      {nutritionPlan.workout && (
                        <>
                          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                            Workout Recommendations:
                          </h3>
                          
                          {nutritionPlan.workout.routine && (
                            <p className="my-2">{nutritionPlan.workout.routine}</p>
                          )}
                          
                          {nutritionPlan.workout.exercises && nutritionPlan.workout.exercises.length > 0 && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Recommended Exercises</h4>
                              {nutritionPlan.workout.exercises.map((exercise, index) => (
                                <div key={index} className="flex items-start my-1 pl-2">
                                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                  <span>{exercise}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      {/* Supplements */}
                      {nutritionPlan.supplements && (
                        <>
                          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mt-6 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                            Supplement Recommendations:
                          </h3>
                          
                          {nutritionPlan.supplements.protein && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Protein</h4>
                              <p className="my-2">{nutritionPlan.supplements.protein}</p>
                            </>
                          )}
                          
                          {nutritionPlan.supplements.creatine && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Creatine</h4>
                              <p className="my-2">{nutritionPlan.supplements.creatine}</p>
                            </>
                          )}
                          
                          {nutritionPlan.supplements.other && nutritionPlan.supplements.other.length > 0 && (
                            <>
                              <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">Other Supplements</h4>
                              {nutritionPlan.supplements.other.map((supp, index) => (
                                <div key={index} className="flex items-start my-1 pl-2">
                                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                                  <span>{supp}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      {/* Source */}
                      {nutritionPlan.source && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                          <p>Source: {nutritionPlan.source}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center min-h-[400px] p-8 text-center border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
              <Apple className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-2xl font-medium text-gray-700 dark:text-gray-300 mb-2">Your Nutrition Plan</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Fill out the form and click "Generate Nutrition Plan" to get your personalized AI-powered nutrition recommendations.</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                <p className="flex items-start">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  Personalized macronutrient recommendations
                </p>
                <p className="flex items-start mt-2">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  Tailored meal plans based on your preferences
                </p>
                <p className="flex items-start mt-2">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  Food recommendations for your specific needs
                </p>
                <p className="flex items-start mt-2">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  Supplement guidance based on your health profile
                </p>
                <p className="flex items-start mt-2">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  Gym routine and supplement recommendations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 