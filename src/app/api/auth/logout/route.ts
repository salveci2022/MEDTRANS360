import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (token) {
    await deleteSession(token).catch(console.error);
  }
  const response = NextResponse.json({ message: "Logout realizado" });
  response.cookies.delete("auth-token");
  return response;
}
