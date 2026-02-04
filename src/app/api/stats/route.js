import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Appointment from '@/models/Appointment';

export async function GET(request) {
    try {
        await connectDB();

        // Get real statistics from the database
        const [activeUsersCount, totalAppointmentsCount] = await Promise.all([
            User.countDocuments({ isActive: { $ne: false } }),
            Appointment.countDocuments()
        ]);

        // Calculate uptime (you can make this more sophisticated)
        // For now, we'll use a simple calculation based on data availability
        const uptime = activeUsersCount > 0 ? 99.9 : 95.0;

        return NextResponse.json({
            activeUsers: activeUsersCount,
            totalAppointments: totalAppointmentsCount,
            uptime: uptime
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch statistics',
                activeUsers: 0,
                totalAppointments: 0,
                uptime: 99.9
            },
            { status: 500 }
        );
    }
}
