"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    if (password.length < 8)
      next.password = "Password must be at least 8 characters";
    if (confirmPassword !== password)
      next.confirmPassword = "Passwords do not match";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({
          form: data.error ?? "Something went wrong. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      // Auto sign-in right after successful signup, so the user isn't forced
      // to re-enter their credentials on a separate login screen.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setIsLoading(false);

      if (result?.error) {
        // Account was created but auto-login failed for some reason —
        // send them to login manually rather than leaving them stuck.
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({
        form: "Network error. Please check your connection and try again.",
      });
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-50">
          Create your account
        </h1>
        <p className="text-neutral-500 mt-2">
          Book services in just a few clicks
        </p>
      </div>

      <Button type="button" variant="outline" onClick={handleGoogleSignIn}>
        <GoogleIcon />
        Sign up with Google
      </Button>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-sm text-neutral-400">or</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="name"
          required
          autoComplete="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="john@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <div>
          <PasswordInput
            label="Password"
            name="password"
            required
            placeholder="Enter a strong password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        {errors.form && (
          <p role="alert" className="text-sm text-accent-rose">
            {errors.form}
          </p>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Creating account..."
        >
          Sign up
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand-600 font-medium hover:text-brand-700"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
