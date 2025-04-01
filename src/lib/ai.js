import axios from 'axios';

const AI_API_URL = 'https://api.example.com/diagnosis'; // Replace with actual AI API URL

export async function getSymptomDiagnosis(symptoms) {
  try {
    const response = await axios.post(AI_API_URL, { symptoms });
    return response.data.diagnosis;
  } catch (error) {
    console.error('Error fetching diagnosis from AI API:', error);
    throw new Error('Failed to get diagnosis');
  }
}