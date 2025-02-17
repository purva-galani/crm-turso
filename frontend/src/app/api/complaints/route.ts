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
      "complainerName",
      "contactNumber",
      "subject",
      "caseOrigin",
      "date",
      "time", 
      "caseStatus",
      "priority",
    ];
    for (const field of requiredFields) {
      if (!(field in body)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Insert into database
    const result = await client.execute({
      sql: `INSERT INTO complaints (
        complainerName, contactNumber, subject, caseOrigin, date, time, caseStatus, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.complainerName,
        body.contactNumber,
        body.subject,
        body.caseOrigin,
        body.date,
        body.time,
        body.caseStatus || "Pending",
        body.priority || "Medium",
      ],
    });

    console.log("Insert result:", result);

    return NextResponse.json(
      { id: Number(result.lastInsertRowid), message: "Complaint created successfully" },
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
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop(); // Extract ID from the URL

    if (!id) {
      throw new Error("Missing complaint ID in request URL.");
    }

    const complaintId = parseInt(id);
    if (isNaN(complaintId)) {
      throw new Error("Invalid complaint ID.");
    }

    const body = await request.json();

    const result = await client.execute({
      sql: `UPDATE complaints SET 
        contactNumber = ?, caseStatus = ?, caseOrigin = ?, subject = ?, priority = ?, date = ?, time = ?, complainerName = ?
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
        complaintId,
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
    if (!params || !params.id) {
      throw new Error("Missing complaint ID in request parameters.");
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      throw new Error("Invalid complaint ID.");
    }

    const result = await client.execute({
      sql: "DELETE FROM complaints WHERE id = ?",
      args: [id],
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
