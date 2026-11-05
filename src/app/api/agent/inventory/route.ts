import { apiError, receiveInventory } from "@/server/inventory-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    return Response.json(await receiveInventory(request), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
