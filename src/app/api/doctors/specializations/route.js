import { NextResponse } from "next/server";
import Doctor from "@/models/Doctor";
import { connectDB } from "@/lib/db";
import { DOCTOR_SPECIALIZATIONS } from "@/constants/specializations";

export async function GET() {
  try {
    await connectDB();

    // First try to get unique specializations from the database
    const uniqueSpecializations = await Doctor.distinct("specialization");
    
    // Also get all secondary specializations and flatten them
    const docs = await Doctor.find({}, { secondarySpecializations: 1, _id: 0 });
    const secondarySpecs = docs
      .flatMap(doc => doc.secondarySpecializations || [])
      .filter(Boolean);
    
    // Combine and deduplicate
    const allSpecializations = [...new Set([...uniqueSpecializations, ...secondarySpecs])];
    
    // If we have specializations in the DB, return them
    if (allSpecializations.length > 0) {
      return NextResponse.json({ specializations: allSpecializations });
    }
    
    // Fallback to predefined list if no specializations found in DB
    return NextResponse.json({ specializations: DOCTOR_SPECIALIZATIONS });
  } catch (error) {
    console.error("Error fetching specializations:", error);
    return NextResponse.json(
      { error: "Failed to fetch specializations" },
      { status: 500 }
    );
  }
} 