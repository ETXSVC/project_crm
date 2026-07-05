import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            A sign-in link has been sent to your inbox. Click the link to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            In development, open{" "}
            <a href="http://localhost:8025" className="text-primary hover:underline" target="_blank" rel="noreferrer">
              Mailhog
            </a>{" "}
            to view the message.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
