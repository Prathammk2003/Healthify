import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import Notification from '@/models/Notification';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils'; // Added validateJWT import
import { sendEmail } from '@/services/notificationService';

// Get all appointments for a doctor
export async function GET(request) {
  try {
    await connectDB();
    console.log('Fetching doctor appointments');

    // Validate authentication using our utility function
    const user = await validateJWT(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const userId = user._id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    // Find the doctor document for this user
    let doctor = await Doctor.findOne({ userId });

    // If no doctor profile exists and the user is a doctor, create one
    if (!doctor && user.role === 'doctor') {
      console.log(`Creating new doctor profile for user ${user._id}`);
      doctor = new Doctor({
        userId: user._id,
        specialization: 'General Physician',
        patients: []
      });
      await doctor.save();
    }

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    console.log(`Found doctor with ID: ${doctor._id} for user: ${userId}`);

    // Get all appointments for this doctor - include pending and pending_update
    const appointments = await Appointment.find({
      doctor: doctor._id
    })
      .populate({
        path: 'userId',
        select: 'name email',
        options: { lean: true }
      })
      .sort({ date: 1, time: 1 });

    console.log(`Found ${appointments.length} appointments for doctor`);

    // Format appointments to handle missing user data
    const formattedAppointments = appointments.map(appointment => {
      // Convert the Mongoose document to a plain object
      const plainAppointment = appointment.toObject ? appointment.toObject() : appointment;

      // Ensure the userId object is properly formatted
      return {
        ...plainAppointment,
        userId: {
          name: plainAppointment.userId?.name || 'Unknown Patient',
          email: plainAppointment.userId?.email || 'No email available',
          _id: plainAppointment.userId?._id || plainAppointment.userId
        }
      };
    });

    return NextResponse.json({
      appointments: formattedAppointments,
      message: `Retrieved ${appointments.length} appointments successfully`
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({
      error: 'Failed to fetch appointments',
      details: error.message
    }, { status: 500 });
  }
}

// Update appointment status
export async function PUT(request) {
  try {
    await connectDB();

    // Validate authentication using our utility function
    const user = await validateJWT(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const userId = user._id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    // Get request body
    const { appointmentId, status, notes } = await request.json();
    if (!appointmentId || !status) {
      return NextResponse.json({ error: 'Appointment ID and status are required' }, { status: 400 });
    }

    // Find the doctor document for this user
    let doctor = await Doctor.findOne({ userId });

    // If no doctor profile exists and the user is a doctor, create one
    if (!doctor && user.role === 'doctor') {
      console.log(`Creating new doctor profile for user ${user._id}`);
      doctor = new Doctor({
        userId: user._id,
        specialization: 'General Physician',
        patients: []
      });
      await doctor.save();
    }

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get the appointment before update
    const originalAppointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id
    });

    if (!originalAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if this is a response to a reschedule request
    const isRespondingToReschedule = originalAppointment.status === 'pending_update';

    // Prepare update data
    let updateData = { status, notes };

    // If approving a reschedule request
    if (isRespondingToReschedule && status === 'approved') {
      // Keep the new date and time as they are (already in the appointment)
      console.log('Approving reschedule request');
    }
    // If rejecting a reschedule request
    else if (isRespondingToReschedule && status === 'rejected') {
      // Revert to the previous date and time
      updateData.date = originalAppointment.previousDate;
      updateData.time = originalAppointment.previousTime;
      console.log('Rejecting reschedule request, reverting to original date/time');
    }

    // Find and update the appointment
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, doctor: doctor._id },
      updateData,
      { new: true }
    );

    // Create notification for the patient
    let notificationMessage = '';
    let notificationMetadata = {
      appointmentId: appointmentId,
      date: appointment.date,
      time: appointment.time,
    };

    // Get doctor's name for notification
    const doctorUser = await User.findById(userId, 'name');
    const doctorName = doctorUser ? doctorUser.name : 'Your doctor';

    if (isRespondingToReschedule) {
      if (status === 'approved') {
        notificationMessage = `${doctorName} has approved your request to reschedule your appointment to ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'reschedule_approved';
      } else if (status === 'rejected') {
        notificationMessage = `${doctorName} has rejected your request to reschedule. Your appointment remains on ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'reschedule_rejected';
      }
    } else {
      // Standard approval/rejection notifications
      if (status === 'approved') {
        notificationMessage = `${doctorName} has approved your appointment on ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'appointment_approved';
      } else if (status === 'rejected') {
        notificationMessage = `${doctorName} has rejected your appointment request for ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'appointment_rejected';
      }
    }

    // Create notification if we have a message
    if (notificationMessage) {
      try {
        await Notification.create({
          userId: appointment.userId,
          type: 'appointment',
          messageContent: notificationMessage,  // Changed from 'message' to 'messageContent'
          metadata: notificationMetadata,
          read: false,
        });
        console.log('Created notification for patient about appointment status update');


        // ✅ SEND EMAIL IMMEDIATELY when appointment is approved/rejected
        try {
          console.log('🔍 Attempting to send appointment status email...');
          console.log('🔍 appointment.userId type:', typeof appointment.userId);
          console.log('🔍 appointment.userId value:', appointment.userId);

          const patientUser = await User.findById(appointment.userId);
          console.log('🔍 Patient user found:', patientUser ? 'YES' : 'NO');

          if (patientUser && patientUser.email) {
            console.log('📧 Patient email:', patientUser.email);

            const emailSubject = status === 'approved'
              ? `Appointment Approved - ${appointment.date}`
              : `Appointment Update - ${appointment.date}`;

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                <h2 style="color: ${status === 'approved' ? '#10b981' : '#ef4444'};">
                  ${status === 'approved' ? '✅ Appointment Approved' : '❌ Appointment Update'}
                </h2>
                <p>Hello ${patientUser.name || 'there'},</p>
                <p>${notificationMessage}</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p style="margin: 5px 0;"><strong>Doctor:</strong> ${doctorName}</p>
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${appointment.date}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.time}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
                </div>
                ${status === 'approved' ?
                '<p style="color: #10b981; font-weight: bold;">✅ Your appointment has been confirmed! Please arrive 15 minutes early.</p>' :
                '<p>If you have any questions, please contact your healthcare provider.</p>'
              }
                <p style="margin-top: 20px;">Thank you for choosing our healthcare service!</p>
              </div>
            `;

            await sendEmail({
              email: patientUser.email,
              subject: emailSubject,
              html: emailHtml,
              text: notificationMessage
            });

            console.log(`✅ Email sent successfully to ${patientUser.email} about appointment ${status}!`);
          } else {
            console.log('⚠️ Cannot send email - patient user or email not found');
            console.log('   Patient user exists:', !!patientUser);
            console.log('   Patient email exists:', patientUser?.email || 'NO EMAIL');
          }
        } catch (emailError) {
          console.error('Error sending appointment status email:', emailError);
          // Don't fail the request if email fails
        }

        // ✅ SEND CONFIRMATION EMAIL TO DOCTOR about their action
        try {
          console.log('🔍 Attempting to send confirmation email to doctor...');

          const doctorEmail = user.email; // user is already fetched via validateJWT

          if (doctorEmail) {
            console.log('📧 Doctor email:', doctorEmail);

            const doctorEmailSubject = status === 'approved'
              ? `Appointment Confirmed - ${appointment.date}`
              : `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} - ${appointment.date}`;

            const patientName = patientUser ? patientUser.name : 'Patient';

            const doctorEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                <h2 style="color: ${status === 'approved' ? '#10b981' : '#ef4444'};">
                  ${status === 'approved' ? '✅ Appointment Confirmed' : '❌ Appointment ' + status.charAt(0).toUpperCase() + status.slice(1)}
                </h2>
                <p>Hello Dr. ${doctorName},</p>
                <p>This is a confirmation that you have <strong>${status}</strong> the following appointment:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p style="margin: 5px 0;"><strong>Patient:</strong> ${patientName}</p>
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${appointment.date}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.time}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
                </div>
                ${status === 'approved' ?
                '<p style="color: #10b981; font-weight: bold;">✅ The patient has been notified and will arrive 15 minutes early.</p>' :
                '<p>The patient has been notified of this update.</p>'
              }
                <p style="margin-top: 20px;">Thank you for using our healthcare service!</p>
              </div>
            `;

            await sendEmail({
              email: doctorEmail,
              subject: doctorEmailSubject,
              html: doctorEmailHtml,
              text: `Confirmation: You have ${status} the appointment with ${patientName} on ${appointment.date} at ${appointment.time}.`
            });

            console.log(`✅ Confirmation email sent successfully to doctor ${doctorEmail}!`);
          } else {
            console.log('⚠️ Cannot send confirmation email - doctor email not found');
          }
        } catch (doctorEmailError) {
          console.error('Error sending confirmation email to doctor:', doctorEmailError);
          // Don't fail the request if email fails
        }
      } catch (error) {
        console.error('Error creating notification:', error);
        // Don't fail the update if notification creation fails
      }
    }

    // If the doctor approved the appointment, associate the patient with the doctor
    if (status === 'approved') {
      try {
        // Get patient profile using userId from appointment
        const patientProfile = await UserProfile.findOne({ userId: appointment.userId });

        if (patientProfile) {
          // Check if patient is already associated with this doctor
          if (!doctor.patients.some(patientId => patientId.toString() === patientProfile._id.toString())) {
            // Add patient to doctor's patient list
            doctor.patients.push(patientProfile._id);
            await doctor.save();
            console.log(`Associated patient ${patientProfile._id} with doctor ${doctor._id} after approval`);
          }
        }
      } catch (error) {
        console.error('Error associating patient with doctor:', error);
        // Don't fail the appointment update if association fails
      }
    }

    return NextResponse.json({
      message: `Appointment ${status} successfully`,
      appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}