import { NextResponse } from "next/server";
import { listServices } from "@/lib/services";

export function GET() {
  return NextResponse.json({ services: listServices() });
}
