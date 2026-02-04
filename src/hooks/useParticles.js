import { useState, useEffect } from 'react';

/**
 * Custom hook to generate particles data on client-side to prevent hydration mismatches
 * @param {number} count - Number of particles to generate
 * @returns {Array} Array of particle objects with position and animation data
 */
export function useParticles(count = 8) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particle data only on client side to prevent hydration mismatch
    const particleData = [...Array(count)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 20,
      animationDuration: 15 + Math.random() * 10
    }));
    setParticles(particleData);
  }, [count]);

  return particles;
}

export default useParticles;
