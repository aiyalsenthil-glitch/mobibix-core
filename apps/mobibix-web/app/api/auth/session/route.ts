import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const cookieStore = await cookies();

    if (!token) {
      cookieStore.delete("mobi_session_token");
      return NextResponse.json({ success: true });
    }

    // Set cookie that middleware can read
    cookieStore.set("mobi_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("mobi_session_token");
  return NextResponse.json({ success: true });
}
