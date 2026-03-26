export const dynamic = "force-dynamic";

import { getFeatureFlags } from "@/lib/feature-flags";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const flags = await getFeatureFlags();
  return <LoginForm showRegisterLink={flags.openRegistration} />;
}
