import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { validationIssues } from "@/lib/validation/recipe";

export function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details === undefined ? {} : { details }) },
    { status },
  );
}

export function zodErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse("Validation failed", 422, validationIssues(error));
  }
  return null;
}
