"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginAdmin } from "@/actions/auth";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const fromParam = searchParams.get("from");
  const targetUrl =
    fromParam && fromParam.startsWith("/admin") && !fromParam.startsWith("//")
      ? fromParam
      : "/admin/dashboard";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage("Please enter your username.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAdmin({
          username: trimmedUsername,
          password,
        });

        if (result.success) {
          router.push(targetUrl);
          router.refresh();
        } else {
          setErrorMessage(
            result.error || "Invalid username or password. Please try again."
          );
        }
      } catch (err) {
        console.error("Login submission error:", err);
        setErrorMessage(
          "An unexpected error occurred. Please verify your connection."
        );
      }
    });
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between items-center bg-background px-4 py-8 sm:px-6 sm:py-12 select-none">
      {/* Ambient Architectural Gradient Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-40 size-96 rounded-full bg-[oklch(0.68_0.12_78/0.05)] blur-3xl" />
      </div>

      {/* Top Bar: Return Link */}
      <header className="w-full max-w-md flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 active:scale-[0.98]"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Public Sanctuary</span>
        </Link>
        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/80">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Encrypted Session</span>
        </span>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md my-auto z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link
            href="/"
            title="Parlak Resort"
            className="mb-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <AdminBrandLogo variant="full" size="xl" priority />
          </Link>
          <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Admin Cockpit
          </h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground tracking-wider uppercase">
            Operations Desk Access
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-6 sm:p-8 shadow-sm backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground">
              Sign In to Your Account
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Authorized resort operations desk personnel only.
            </p>
          </div>

          {/* Inline Error Alert Banner */}
          {errorMessage && (
            <div className="mb-5">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(errorMessage)}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  spellCheck={false}
                  placeholder="e.g. admin1…"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  className="text-base md:text-sm"
                  required
                />
              </Field>

              <Field data-invalid={Boolean(errorMessage)}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup isError={Boolean(errorMessage)}>
                  <InputGroupInput
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    spellCheck={false}
                    placeholder="Enter your password…"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    className="pr-2 font-mono tracking-tight text-base md:text-sm"
                    required
                  />
                  <InputGroupAddon className="px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="default"
                  loading={isPending}
                  disabled={isPending}
                  className="w-full h-11 text-sm font-semibold tracking-wide"
                >
                  <Lock className="size-4" data-icon="inline-start" />
                  <span>Sign In to Cockpit</span>
                </Button>
              </div>
            </FieldGroup>
          </form>
        </div>
      </main>

      {/* Footer Security Note */}
      <footer className="w-full max-w-md text-center z-10 mt-8">
        <p className="text-[11px] text-muted-foreground">
          Parlak Resort & Farmhouse • Vallivattom, Kerala 680661
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          Internal Management System • Unauthorized access is strictly prohibited
        </p>
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background" />
      }
    >
      <LoginFormInner />
    </React.Suspense>
  );
}
