import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

// Initialize Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create a new complaint
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Received body:", body);

    // Validation
    const requiredFields = [
      "contactNumber",
      "caseOrigin",
      "subject",
      "date",
      "time",
      "complainerName",
    ];
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Insert into database
    const result = await client.execute({
      sql: `INSERT INTO complaints (
        contact_number, case_status, case_origin, subject, priority, date, time, complainer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.contactNumber,
        body.caseStatus || "Pending",
        body.caseOrigin,
        body.subject,
        body.priority || "Medium",
        body.date,
        body.time,
        body.complainerName,
      ],
    });

    console.log("Insert result:", result);

    return NextResponse.json(
      { id: result.lastInsertRowid, message: "Complaint created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get all complaints
export async function GET(request: Request) {
  try {
    const result = await client.execute({
      sql: "SELECT * FROM complaints",
      args: [], // Add empty args array
    });

    return NextResponse.json(
      { success: true, complaints: result.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get a specific complaint by ID
export async function GET_BY_ID(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await client.execute({
      sql: "SELECT * FROM complaints WHERE id = ?",
      args: [parseInt(id)],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, complaint: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Update a specific complaint by ID
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const result = await client.execute({
      sql: `UPDATE complaints SET 
        contact_number = ?, case_status = ?, case_origin = ?, subject = ?, priority = ?, date = ?, time = ?, complainer_name = ?
        WHERE id = ?`,
      args: [
        body.contactNumber,
        body.caseStatus,
        body.caseOrigin,
        body.subject,
        body.priority,
        body.date,
        body.time,
        body.complainerName,
        parseInt(id),
      ],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Complaint updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Delete a specific complaint by ID
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await client.execute({
      sql: "DELETE FROM complaints WHERE id = ?",
      args: [parseInt(id)],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { success: false, message: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Complaint deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting complaint:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}