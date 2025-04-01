'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, ArrowLeft, Scale, Apple, Activity } from 'lucide-react';
import Link from 'next/link';

export default function NutritionPlanner() {
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: 'male',
    activityLevel: 'moderate'
  });
  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateBMR = () => {
    // Mifflin-St Jeor Equation for BMR
    const bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age);
    return formData.gender === 'male' ? bmr + 5 : bmr - 161;
  };

  const getActivityMultiplier = () => {
    const multipliers = {
      sedentary: 1.2,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
      extraActive: 2.1
    };
    return multipliers[formData.activityLevel] || 1.55;
  };

  const generateNutritionPlan = (bmi, category, tdee) => {
    const plans = {
      underweight: {
        dailyCalories: Math.round(tdee * 1.2),
        recommendations: `
          <div class="space-y-4">
            <div class="bg-blue-50/50 dark:bg-blue-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">Caloric Intake</h4>
              <p>Your daily caloric needs: ${Math.round(tdee * 1.2)} calories</p>
              <p>This is a 20% increase from your TDEE to support healthy weight gain.</p>
            </div>
            
            <div class="bg-green-50/50 dark:bg-green-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 dark:text-green-300 mb-2">Macronutrient Breakdown</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Protein: 25-30% (${Math.round(tdee * 1.2 * 0.3 / 4)}g)</li>
                <li>Carbohydrates: 45-50% (${Math.round(tdee * 1.2 * 0.5 / 4)}g)</li>
                <li>Healthy Fats: 20-25% (${Math.round(tdee * 1.2 * 0.25 / 9)}g)</li>
              </ul>
            </div>

            <div class="bg-purple-50/50 dark:bg-purple-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">Food Recommendations</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Lean proteins: Chicken, fish, eggs, legumes</li>
                <li>Complex carbohydrates: Whole grains, sweet potatoes, quinoa</li>
                <li>Healthy fats: Avocados, nuts, olive oil</li>
                <li>Calorie-dense foods: Nut butters, dried fruits, smoothies</li>
              </ul>
            </div>

            <div class="bg-amber-50/50 dark:bg-amber-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-amber-800 dark:text-amber-300 mb-2">Meal Timing</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Eat 5-6 smaller meals throughout the day</li>
                <li>Include protein in every meal</li>
                <li>Have a calorie-dense snack before bed</li>
                <li>Consider post-workout protein shakes</li>
              </ul>
            </div>

            <div class="bg-red-50/50 dark:bg-red-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-red-800 dark:text-red-300 mb-2">Foods to Avoid</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Empty calories from sugary drinks</li>
                <li>Highly processed foods</li>
                <li>Excessive caffeine</li>
                <li>Foods that suppress appetite</li>
              </ul>
            </div>

            <div class="bg-indigo-50/50 dark:bg-indigo-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Sample Meal Plan</h4>
              <div class="space-y-2">
                <p><strong>Breakfast:</strong> Oatmeal with banana, peanut butter, and protein powder</p>
                <p><strong>Mid-morning:</strong> Greek yogurt with granola and honey</p>
                <p><strong>Lunch:</strong> Chicken quinoa bowl with avocado</p>
                <p><strong>Afternoon:</strong> Trail mix and dried fruits</p>
                <p><strong>Dinner:</strong> Salmon with sweet potato and vegetables</p>
                <p><strong>Evening:</strong> Protein smoothie with nut butter</p>
              </div>
            </div>

            <div class="bg-teal-50/50 dark:bg-teal-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-teal-800 dark:text-teal-300 mb-2">Additional Tips</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Track your calorie intake daily</li>
                <li>Gradually increase portion sizes</li>
                <li>Stay hydrated with water and milk</li>
                <li>Consider working with a nutritionist</li>
                <li>Monitor weight gain (aim for 0.5-1 kg per week)</li>
              </ul>
            </div>
          </div>
        `
      },
      normal: {
        dailyCalories: Math.round(tdee),
        recommendations: `
          <div class="space-y-4">
            <div class="bg-blue-50/50 dark:bg-blue-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">Caloric Intake</h4>
              <p>Your daily caloric needs: ${Math.round(tdee)} calories</p>
              <p>This is your TDEE to maintain your current weight.</p>
            </div>
            
            <div class="bg-green-50/50 dark:bg-green-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 dark:text-green-300 mb-2">Macronutrient Breakdown</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Protein: 20-25% (${Math.round(tdee * 0.25 / 4)}g)</li>
                <li>Carbohydrates: 45-55% (${Math.round(tdee * 0.5 / 4)}g)</li>
                <li>Healthy Fats: 20-30% (${Math.round(tdee * 0.25 / 9)}g)</li>
              </ul>
            </div>

            <div class="bg-purple-50/50 dark:bg-purple-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">Food Recommendations</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Lean proteins: Fish, poultry, legumes</li>
                <li>Whole grains: Brown rice, oats, whole wheat</li>
                <li>Healthy fats: Olive oil, nuts, seeds</li>
                <li>Colorful vegetables and fruits</li>
                <li>Dairy or dairy alternatives</li>
              </ul>
            </div>

            <div class="bg-amber-50/50 dark:bg-amber-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-amber-800 dark:text-amber-300 mb-2">Meal Timing</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>3 main meals and 2-3 snacks</li>
                <li>Eat every 4-5 hours</li>
                <li>Include protein in each meal</li>
                <li>Have a light snack before bed if needed</li>
              </ul>
            </div>

            <div class="bg-red-50/50 dark:bg-red-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-red-800 dark:text-red-300 mb-2">Foods to Limit</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Processed foods and snacks</li>
                <li>Sugary beverages</li>
                <li>Excessive alcohol</li>
                <li>High-sodium foods</li>
              </ul>
            </div>

            <div class="bg-indigo-50/50 dark:bg-indigo-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Sample Meal Plan</h4>
              <div class="space-y-2">
                <p><strong>Breakfast:</strong> Whole grain toast with eggs and avocado</p>
                <p><strong>Mid-morning:</strong> Fruit and nuts</p>
                <p><strong>Lunch:</strong> Grilled chicken salad with olive oil dressing</p>
                <p><strong>Afternoon:</strong> Greek yogurt with berries</p>
                <p><strong>Dinner:</strong> Baked fish with quinoa and vegetables</p>
                <p><strong>Evening:</strong> Small piece of dark chocolate</p>
              </div>
            </div>

            <div class="bg-teal-50/50 dark:bg-teal-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-teal-800 dark:text-teal-300 mb-2">Additional Tips</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Practice mindful eating</li>
                <li>Stay hydrated throughout the day</li>
                <li>Include variety in your diet</li>
                <li>Read food labels</li>
                <li>Cook meals at home when possible</li>
              </ul>
            </div>
          </div>
        `
      },
      overweight: {
        dailyCalories: Math.round(tdee * 0.8),
        recommendations: `
          <div class="space-y-4">
            <div class="bg-blue-50/50 dark:bg-blue-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">Caloric Intake</h4>
              <p>Your daily caloric needs: ${Math.round(tdee * 0.8)} calories</p>
              <p>This is a 20% reduction from your TDEE for gradual weight loss.</p>
            </div>
            
            <div class="bg-green-50/50 dark:bg-green-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 dark:text-green-300 mb-2">Macronutrient Breakdown</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Protein: 30-35% (${Math.round(tdee * 0.8 * 0.35 / 4)}g)</li>
                <li>Carbohydrates: 40-45% (${Math.round(tdee * 0.8 * 0.45 / 4)}g)</li>
                <li>Healthy Fats: 20-25% (${Math.round(tdee * 0.8 * 0.2 / 9)}g)</li>
              </ul>
            </div>

            <div class="bg-purple-50/50 dark:bg-purple-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">Food Recommendations</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>High-protein foods: Lean meats, fish, eggs</li>
                <li>Low-carb vegetables: Leafy greens, broccoli, cauliflower</li>
                <li>Healthy fats: Avocado, nuts, olive oil</li>
                <li>Fiber-rich foods: Berries, legumes, whole grains</li>
                <li>Low-calorie snacks: Vegetables, fruits</li>
              </ul>
            </div>

            <div class="bg-amber-50/50 dark:bg-amber-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-amber-800 dark:text-amber-300 mb-2">Meal Timing</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Eat 4-5 smaller meals</li>
                <li>Include protein in every meal</li>
                <li>Have dinner 3-4 hours before bed</li>
                <li>Consider intermittent fasting</li>
                <li>Plan meals in advance</li>
              </ul>
            </div>

            <div class="bg-red-50/50 dark:bg-red-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-red-800 dark:text-red-300 mb-2">Foods to Avoid</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Processed and fried foods</li>
                <li>Sugary drinks and desserts</li>
                <li>White bread and refined grains</li>
                <li>High-calorie snacks</li>
                <li>Alcohol</li>
              </ul>
            </div>

            <div class="bg-indigo-50/50 dark:bg-indigo-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Sample Meal Plan</h4>
              <div class="space-y-2">
                <p><strong>Breakfast:</strong> Protein smoothie with spinach and berries</p>
                <p><strong>Mid-morning:</strong> Hard-boiled eggs and vegetables</p>
                <p><strong>Lunch:</strong> Grilled chicken with quinoa and salad</p>
                <p><strong>Afternoon:</strong> Greek yogurt with nuts</p>
                <p><strong>Dinner:</strong> Baked fish with roasted vegetables</p>
                <p><strong>Evening:</strong> Small portion of fruit</p>
              </div>
            </div>

            <div class="bg-teal-50/50 dark:bg-teal-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-teal-800 dark:text-teal-300 mb-2">Additional Tips</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Track your food intake</li>
                <li>Use smaller plates</li>
                <li>Eat slowly and mindfully</li>
                <li>Stay hydrated</li>
                <li>Get adequate sleep</li>
                <li>Consider working with a nutritionist</li>
              </ul>
            </div>
          </div>
        `
      },
      obese: {
        dailyCalories: Math.round(tdee * 0.7),
        recommendations: `
          <div class="space-y-4">
            <div class="bg-blue-50/50 dark:bg-blue-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">Caloric Intake</h4>
              <p>Your daily caloric needs: ${Math.round(tdee * 0.7)} calories</p>
              <p>This is a 30% reduction from your TDEE for significant weight loss.</p>
            </div>
            
            <div class="bg-green-50/50 dark:bg-green-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 dark:text-green-300 mb-2">Macronutrient Breakdown</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Protein: 35-40% (${Math.round(tdee * 0.7 * 0.4 / 4)}g)</li>
                <li>Carbohydrates: 35-40% (${Math.round(tdee * 0.7 * 0.4 / 4)}g)</li>
                <li>Healthy Fats: 20-25% (${Math.round(tdee * 0.7 * 0.2 / 9)}g)</li>
              </ul>
            </div>

            <div class="bg-purple-50/50 dark:bg-purple-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">Food Recommendations</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Lean proteins: Chicken breast, fish, eggs</li>
                <li>Non-starchy vegetables: Leafy greens, broccoli, cauliflower</li>
                <li>Healthy fats: Avocado, nuts, olive oil</li>
                <li>High-fiber foods: Berries, legumes, whole grains</li>
                <li>Low-calorie snacks: Vegetables, fruits</li>
              </ul>
            </div>

            <div class="bg-amber-50/50 dark:bg-amber-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-amber-800 dark:text-amber-300 mb-2">Meal Timing</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Eat 4-5 smaller meals</li>
                <li>Include protein in every meal</li>
                <li>Have dinner 3-4 hours before bed</li>
                <li>Consider intermittent fasting</li>
                <li>Plan meals in advance</li>
              </ul>
            </div>

            <div class="bg-red-50/50 dark:bg-red-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-red-800 dark:text-red-300 mb-2">Foods to Avoid</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Processed and fried foods</li>
                <li>Sugary drinks and desserts</li>
                <li>White bread and refined grains</li>
                <li>High-calorie snacks</li>
                <li>Alcohol</li>
              </ul>
            </div>

            <div class="bg-indigo-50/50 dark:bg-indigo-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Sample Meal Plan</h4>
              <div class="space-y-2">
                <p><strong>Breakfast:</strong> Protein smoothie with spinach and berries</p>
                <p><strong>Mid-morning:</strong> Hard-boiled eggs and vegetables</p>
                <p><strong>Lunch:</strong> Grilled chicken with quinoa and salad</p>
                <p><strong>Afternoon:</strong> Greek yogurt with nuts</p>
                <p><strong>Dinner:</strong> Baked fish with roasted vegetables</p>
                <p><strong>Evening:</strong> Small portion of fruit</p>
              </div>
            </div>

            <div class="bg-teal-50/50 dark:bg-teal-900/50 p-4 rounded-lg">
              <h4 class="font-semibold text-teal-800 dark:text-teal-300 mb-2">Additional Tips</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Track your food intake</li>
                <li>Use smaller plates</li>
                <li>Eat slowly and mindfully</li>
                <li>Stay hydrated</li>
                <li>Get adequate sleep</li>
                <li>Consider working with a nutritionist</li>
              </ul>
            </div>
          </div>
        `
      }
    };

    return plans[category] || plans.normal;
  };

  const calculateBMI = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!formData.height || !formData.weight || !formData.age) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const heightInMeters = formData.height / 100;
    const bmiValue = formData.weight / (heightInMeters * heightInMeters);
    setBmi(bmiValue.toFixed(1));

    // Calculate TDEE
    const bmr = calculateBMR();
    const activityMultiplier = getActivityMultiplier();
    const tdee = bmr * activityMultiplier;

    // Determine BMI category
    let category = '';
    if (bmiValue < 18.5) category = 'underweight';
    else if (bmiValue >= 18.5 && bmiValue < 25) category = 'normal';
    else if (bmiValue >= 25 && bmiValue < 30) category = 'overweight';
    else category = 'obese';
    setBmiCategory(category);

    // Generate nutrition plan with TDEE
    const plan = generateNutritionPlan(bmiValue, category, tdee);
    setNutritionPlan(plan);
    setLoading(false);
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
      <div className="flex items-center justify-between">
        <Link href="/dashboard/patient">
          <button className="button-secondary">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </Link>
        <h1 className="text-3xl font-bold gradient-heading flex items-center">
          <Apple className="h-8 w-8 text-green-500 mr-3" />
          Nutrition & Diet Planner
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BMI Calculator Form */}
        <div className="glass-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold gradient-heading">Calculate Your BMI</h2>
            <Scale className="h-6 w-6 text-blue-500" />
          </div>

          <form onSubmit={calculateBMI} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="form-input"
                  required
                  min="1"
                  max="300"
                />
              </div>
              <div>
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="form-input"
                  required
                  min="1"
                  max="500"
                />
              </div>
              <div>
                <label className="form-label">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="form-input"
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
                  className="form-input"
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
                className="form-input"
                required
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="moderate">Moderate (light exercise/sports 1-3 days/week)</option>
                <option value="active">Active (moderate exercise/sports 3-5 days/week)</option>
                <option value="veryActive">Very Active (hard exercise/sports 6-7 days/week)</option>
                <option value="extraActive">Extra Active (very hard exercise & physical job)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5 mr-2" />
                  Calculate BMI & Get Diet Plan
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {bmi && nutritionPlan && (
          <div className="space-y-8">
            <div className="glass-card">
              <h2 className="text-2xl font-semibold gradient-heading mb-6">Your Results</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">BMI Score</h3>
                  <div className="progress-bar mb-2">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(bmi / 40) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">Your BMI: {bmi}</span>
                    <span className="text-blue-600 dark:text-blue-400">Category: {bmiCategory}</span>
                  </div>
                </div>

                <div className="p-4 bg-green-50/50 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-medium text-green-800 dark:text-green-300 mb-2">Daily Calorie Needs</h3>
                  <p className="text-green-600 dark:text-green-400">
                    {nutritionPlan.dailyCalories} calories/day
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h2 className="text-2xl font-semibold gradient-heading mb-6">Your Personalized Plan</h2>
              
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: nutritionPlan.recommendations }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-card bg-red-50/50 dark:bg-red-900/50 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
} 