"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { loginAction, magicLinkAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";
import type { AuthProviderFlags } from "@/lib/auth/provider-flags";

type LoginFormProps = {
  providers: AuthProviderFlags;
};

export function LoginForm({ providers }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      setMagicMessage(null);
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  function onMagicLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      setMagicMessage(null);
      const result = await magicLinkAction(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setMagicMessage(result.message ?? "Check your email for a sign-in link.");
    });
  }

  function handleOAuth(provider: "google" | "github") {
    setError(null);
    void signIn(provider, { callbackUrl: "/dashboard" });
  }

  const showOAuth = providers.google || providers.github;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {magicMessage && (
            <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{magicMessage}</div>
          )}

          {showOAuth && (
            <div className="space-y-2">
              {providers.google && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() => handleOAuth("google")}
                >
                  Continue with Google
                </Button>
              )}
              {providers.github && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() => handleOAuth("github")}
                >
                  Continue with GitHub
                </Button>
              )}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onCredentialsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="demo@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in with password"}
            </Button>
          </form>

          {providers.magicLink && (
            <form onSubmit={onMagicLinkSubmit} className="space-y-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">Or receive a one-time sign-in link</p>
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email for magic link</Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
                {pending ? "Sending link..." : "Email me a sign-in link"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
