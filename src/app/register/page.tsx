import { notFound } from "next/navigation";
import { getFeatureFlags } from "@/lib/feature-flags";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const flags = await getFeatureFlags();

  if (!flags.openRegistration) {
    notFound();
  }

  return <RegisterForm />;
}
