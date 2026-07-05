import { LoginForm } from "@/components/auth/login-form";
import { getAuthProviderFlags } from "@/lib/auth/provider-flags";

export default function LoginPage() {
  return <LoginForm providers={getAuthProviderFlags()} />;
}
