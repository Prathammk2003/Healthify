/**
 * Helper functions and data for the nutrition API
 */

// Regional cuisine data
export const regionalCuisines = {
  'south-indian': {
    breakfast: ['Idli with sambar and coconut chutney', 'Dosa with potato masala and tomato chutney', 'Upma with vegetables and curry leaves', 'Pongal with ghee and cashews', 'Medu vada with coconut chutney'],
    lunch: ['Rice with sambar, rasam, and vegetable poriyal', 'Bisi bele bath with raita', 'Curd rice with pickle and papad', 'Rice with fish curry and vegetable thoran', 'Lemon rice with roasted peanuts and vegetables'],
    dinner: ['Chapati with vegetable kurma', 'Ragi mudde with soppu saaru', 'Millet dosa with peanut chutney', 'Appam with vegetable stew', 'Adai with avial'],
    snacks: ['Murukku with filter coffee', 'Mysore pak', 'Sundal (spiced chickpeas)', 'Chakli with buttermilk', 'Bonda with mint chutney']
  },
  'north-indian': {
    breakfast: ['Aloo paratha with curd and pickle', 'Poha with peanuts and coriander', 'Besan cheela with mint chutney', 'Chole bhature with pickled onions', 'Stuffed paneer paratha with green chutney'],
    lunch: ['Dal makhani with jeera rice and raita', 'Rajma chawal with pickle and papad', 'Chole with bhatura and onion salad', 'Paneer butter masala with naan', 'Aloo gobi with roti and dal'],
    dinner: ['Palak paneer with missi roti', 'Dal tadka with rice and papad', 'Vegetable biryani with raita', 'Paneer tikka masala with kulcha', 'Baingan bharta with roti and dahi'],
    snacks: ['Samosa with tamarind chutney', 'Kachori with aloo sabzi', 'Dahi bhalla with sonth chutney', 'Aloo tikki with chutneys', 'Mathri with pickle']
  },
  'mediterranean': {
    breakfast: ['Greek yogurt with honey and walnuts', 'Shakshuka with whole grain bread', 'Avocado toast with poached eggs and za\'atar', 'Whole grain porridge with dried fruits and nuts', 'Labneh with olive oil and whole grain pita'],
    lunch: ['Mediterranean salad with feta and olives', 'Falafel wrap with tahini sauce', 'Lentil soup with whole grain bread', 'Grilled seafood with tabbouleh', 'Chicken souvlaki with Greek salad'],
    dinner: ['Baked fish with roasted vegetables', 'Vegetable moussaka with side salad', 'Whole grain pasta with vegetables and olive oil', 'Ratatouille with quinoa', 'Grilled lamb with bulgur pilaf'],
    snacks: ['Hummus with vegetable sticks', 'Mixed olives and feta', 'Tzatziki with pita chips', 'Roasted chickpeas with herbs', 'Fresh fruit with a small handful of nuts']
  },
  'east-asian': {
    breakfast: ['Congee with century egg and scallions', 'Miso soup with tofu and seaweed', 'Steamed buns with vegetable filling', 'Rice porridge with fish and ginger', 'Tamagoyaki with steamed rice and nori'],
    lunch: ['Soba noodles with dipping sauce', 'Vegetable bibimbap with gochujang', 'Tofu and vegetable stir-fry with brown rice', 'Teriyaki chicken with steamed vegetables', 'Tom yum soup with rice noodles'],
    dinner: ['Steamed fish with ginger and scallions', 'Mapo tofu with brown rice', 'Vegetable hot pot with dipping sauces', 'Korean barbecue with banchan sides', 'Vegetable pho with herbs'],
    snacks: ['Edamame with sea salt', 'Seaweed snacks', 'Rice crackers with green tea', 'Cucumber with sesame dressing', 'Fruit with plum powder']
  },
  'mexican': {
    breakfast: ['Huevos rancheros with corn tortillas', 'Chilaquiles with avocado and queso fresco', 'Mexican oatmeal with cinnamon and fruits', 'Breakfast burrito with beans and vegetables', 'Molletes with pico de gallo'],
    lunch: ['Taco salad with beans and corn', 'Tortilla soup with avocado and lime', 'Vegetable fajitas with guacamole', 'Stuffed poblano peppers with rice and beans', 'Fish tacos with cabbage slaw'],
    dinner: ['Black bean and vegetable enchiladas', 'Chicken mole with rice', 'Ceviche with jicama and citrus', 'Chiles rellenos with tomato sauce', 'Pozole with radishes and lime'],
    snacks: ['Guacamole with vegetable sticks', 'Roasted pepitas with chili and lime', 'Jicama with chili powder and lime', 'Baked tortilla chips with salsa', 'Mexican fruit salad with chili and lime']
  },
  'general': {
    breakfast: ['Oatmeal with berries and nuts', 'Whole grain toast with avocado and egg', 'Greek yogurt with seeds and fruit', 'Smoothie bowl with granola', 'Vegetable omelet with whole grain toast'],
    lunch: ['Quinoa salad with roasted vegetables', 'Lentil soup with whole grain bread', 'Chicken and vegetable wrap', 'Grain bowl with roasted vegetables and tahini', 'Mixed green salad with protein'],
    dinner: ['Baked fish with roasted vegetables', 'Stir fry with brown rice', 'Bean and vegetable chili', 'Grilled chicken with sweet potato and greens', 'Vegetable curry with brown rice'],
    snacks: ['Apple with almond butter', 'Vegetable sticks with hummus', 'Greek yogurt with berries', 'Trail mix with nuts and dried fruit', 'Hard-boiled egg with whole grain crackers']
  }
};

/**
 * Gets regional cuisine data based on preference
 * @param {string} preference - The regional cuisine preference
 * @returns {Object} The cuisine data for the specified region or general cuisine
 */
export function getRegionalCuisine(preference) {
  return regionalCuisines[preference] || regionalCuisines['general'];
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
  }
  
  // Activity-based recommendations
  if (userData.activityLevel === 'veryActive' || userData.activityLevel === 'extraActive') {
    recommendations.push('Electrolyte supplements for intense workouts');
    recommendations.push('Branch chain amino acids (BCAAs) for recovery');
  }
  
  return recommendations;
} 