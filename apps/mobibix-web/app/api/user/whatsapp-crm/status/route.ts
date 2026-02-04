import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the backend API URL from environment or use default
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost_REPLACED:3000/api";

    // Get auth token from cookies or headers
    const authHeader = request.headers.get("authorization");

    // Call the backend endpoint
    const response = await fetch(`${backendUrl}/user/whatsapp-crm/status`, {
      method: "GET",
      headers: {
        Authorization: authHeader || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching WhatsApp CRM status:", error);
    return NextResponse.json(
      { error: "Failed to fetch WhatsApp CRM status" },
      { status: 500 },
    );
  }
}
