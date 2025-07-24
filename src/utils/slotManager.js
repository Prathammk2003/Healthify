import TimeSlot from '@/models/TimeSlot';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import { connectDB } from '@/lib/db';

/**
 * Generate time slots for a specific date based on a doctor's availability
 * @param {string} doctorId - The ID of the doctor
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {number} slotDuration - Duration of each slot in minutes (default: 30)
 * @returns {Promise<Array>} - Array of generated time slots
 */
export async function generateTimeSlotsForDate(doctorId, date, slotDuration = 30) {
  await connectDB();
  
  // Get the day of week (0-6, where 0 is Sunday)
  const dayOfWeek = new Date(date).getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dayOfWeek];
  
  // Get the doctor's availability for this day
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.availability) {
    return [];
  }
  
  // Find the availability entry for this day
  const dayAvailability = doctor.availability.find(a => 
    a.day.toLowerCase() === dayName.toLowerCase()
  );
  
  if (!dayAvailability || !dayAvailability.startTime || !dayAvailability.endTime) {
    return [];
  }
  
  // Parse start and end times (HH:MM format)
  const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
  const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Generate time slots
  const slots = [];
  
  for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    slots.push({
      doctor: doctorId,
      date,
      time: timeString,
      duration: slotDuration,
      isBooked: false,
      isRecurring: true,
    });
  }
  
  return slots;
}

/**
 * Get available time slots for a doctor on a specific date
 * @param {string} doctorId - The ID of the doctor
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise<Array>} - Array of available time slots
 */
export async function getAvailableTimeSlots(doctorId, date) {
  await connectDB();
  
  // Check if slots have already been generated for this date
  let slots = await TimeSlot.find({ doctor: doctorId, date });
  
  // If no slots exist for this date, generate them
  if (slots.length === 0) {
    const generatedSlots = await generateTimeSlotsForDate(doctorId, date);
    
    // If we generated slots, save them to the database
    if (generatedSlots.length > 0) {
      await TimeSlot.insertMany(generatedSlots);
      slots = await TimeSlot.find({ doctor: doctorId, date });
    }
  } else {
    // If there are manually created custom slots (where isRecurring is false),
    // we'll prioritize those and not generate default ones
    const hasCustomSlots = slots.some(slot => slot.isRecurring === false);
    
    // If there are no custom slots, we'll fill in with default slots
    // that don't conflict with existing slots
    if (!hasCustomSlots) {
      const generatedSlots = await generateTimeSlotsForDate(doctorId, date);
      
      // Filter out generated slots that overlap with existing slots
      const existingTimes = slots.map(slot => slot.time);
      const newSlots = generatedSlots.filter(slot => !existingTimes.includes(slot.time));
      
      // Save new slots if any
      if (newSlots.length > 0) {
        await TimeSlot.insertMany(newSlots);
        slots = await TimeSlot.find({ doctor: doctorId, date });
      }
    }
  }
  
  // Find existing appointments to update slot booking status
  const appointments = await Appointment.find({
    doctor: doctorId,
    date,
    status: { $in: ['approved', 'pending_update'] }
  });
  
  // Mark slots as booked if they have appointments
  const bookedTimes = appointments.map(appointment => appointment.time);
  
  // Update the slots
  for (const slot of slots) {
    if (bookedTimes.includes(slot.time) && !slot.isBooked) {
      const appointment = appointments.find(a => a.time === slot.time);
      slot.isBooked = true;
      slot.appointmentId = appointment._id;
      await slot.save();
    } else if (!bookedTimes.includes(slot.time) && slot.isBooked) {
      slot.isBooked = false;
      slot.appointmentId = null;
      await slot.save();
    }
  }
  
  // Return slots sorted by time
  return slots.sort((a, b) => {
    const timeA = parseInt(a.time.replace(':', ''));
    const timeB = parseInt(b.time.replace(':', ''));
    return timeA - timeB;
  });
}

/**
 * Check if a specific time slot is available
 * @param {string} doctorId - The ID of the doctor
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} time - Time string in HH:MM format
 * @returns {Promise<boolean>} - True if slot is available, false otherwise
 */
export async function isTimeSlotAvailable(doctorId, date, time) {
  await connectDB();
  
  // First check if there's a slot entry
  let slot = await TimeSlot.findOne({ doctor: doctorId, date, time });
  
  // If no slot exists, check if it falls within the doctor's availability
  if (!slot) {
    const slots = await generateTimeSlotsForDate(doctorId, date);
    const matchingSlot = slots.find(s => s.time === time);
    
    if (!matchingSlot) {
      return false; // No matching slot in doctor's availability
    }
    
    // Create the slot in the database
    slot = await TimeSlot.create(matchingSlot);
  }
  
  // Check if there's a conflicting appointment
  const existingAppointment = await Appointment.findOne({
    doctor: doctorId,
    date,
    time,
    status: { $in: ['approved', 'pending_update'] }
  });
  
  if (existingAppointment) {
    // Update slot if needed
    if (!slot.isBooked) {
      slot.isBooked = true;
      slot.appointmentId = existingAppointment._id;
      await slot.save();
    }
    return false;
  }
  
  // Update slot if needed
  if (slot.isBooked) {
    slot.isBooked = false;
    slot.appointmentId = null;
    await slot.save();
  }
  
  return true;
}

/**
 * Update slot status when an appointment is created, updated, or deleted
 * @param {Object} appointment - The appointment object
 * @param {string} action - The action: 'create', 'update', or 'delete'
 */
export async function updateSlotFromAppointment(appointment, action) {
  await connectDB();
  
  const { doctor, date, time, _id, status } = appointment;
  
  // Find the relevant slot
  let slot = await TimeSlot.findOne({ doctor, date, time });
  
  // If the slot doesn't exist yet, create it
  if (!slot) {
    const slots = await generateTimeSlotsForDate(doctor, date);
    const matchingSlot = slots.find(s => s.time === time);
    
    if (matchingSlot) {
      slot = await TimeSlot.create(matchingSlot);
    } else {
      // Create a custom slot if it doesn't match the doctor's general availability
      slot = await TimeSlot.create({
        doctor,
        date,
        time,
        isBooked: false,
        isRecurring: false
      });
    }
  }
  
  if (action === 'create' || action === 'update') {
    // Only mark as booked if the appointment is approved or pending_update
    if (['approved', 'pending_update'].includes(status)) {
      slot.isBooked = true;
      slot.appointmentId = _id;
    } else {
      slot.isBooked = false;
      slot.appointmentId = null;
    }
  } else if (action === 'delete') {
    slot.isBooked = false;
    slot.appointmentId = null;
  }
  
  await slot.save();
  
  return slot;
} 