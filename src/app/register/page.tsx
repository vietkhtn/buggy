import { notFound } from "next/navigation";
import { getFeatureFlags } from "@/lib/feature-flags";
import { RegisterForm } from "./register-form";

// Must be dynamic — reads openRegistration flag from the DB at request time
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const flags = await getFeatureFlags();

  if (!flags.openRegistration) {
    notFound();
  }

  return <RegisterForm />;
}
