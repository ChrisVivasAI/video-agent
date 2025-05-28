import { storeSharedVideo, type SharedVideo } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const payload: Omit<SharedVideo, "id"> = await req.json();
    const id = await storeSharedVideo({
      ...payload,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      id,
      params: payload,
    });
  } catch (error) {
    console.error("Share API error:", error);
    return NextResponse.json(
      { error: "Failed to share video" },
      { status: 500 },
    );
  }
};
