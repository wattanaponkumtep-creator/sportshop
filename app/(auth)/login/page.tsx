import { Suspense } from "react";
import { Shirt } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center sport-gradient p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl sport-accent-gradient">
        <Shirt className="h-8 w-8 text-white" />
      </div>
      <p>กำลังโหลด...</p>
    </div>
  );
}
