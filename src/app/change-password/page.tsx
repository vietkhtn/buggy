export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordForm from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Set a new password</h1>
        <p className="text-sm text-gray-500 mb-6">
          You must set a new password before continuing.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
