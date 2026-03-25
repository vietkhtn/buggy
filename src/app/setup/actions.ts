"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { db } from "@/lib/db";

const setupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export type SetupState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  error?: string;
} | null;

export async function setupAction(
  _prevState: SetupState,
  formData: FormData
): Promise<SetupState> {
  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const count = await tx.user.count({ where: { isWorkspaceAdmin: true } });
      if (count > 0) throw new Error("SETUP_COMPLETE");
      const hash = await bcrypt.hash(password, 12);
      await tx.user.create({
        data: {
          name,
          email,
          password: hash,
          isWorkspaceAdmin: true,
        },
      });
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "SETUP_COMPLETE") {
      return { error: "Setup is already complete. Redirecting to login…" };
    }
    console.error("Setup action error", err);
    return { error: "Something went wrong. Please try again." };
  }

  // signIn throws NEXT_REDIRECT internally — Next.js catches it and redirects.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/setup/settings",
  });

  return null;
}
