"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { GoogleAuthDivider } from "../ui/Or";

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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="name"
          required
          autoComplete="name"
          placeholder="Enter full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="Enter email address"
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
          disabled={
            isLoading ||
            (!name.trim() &&
              !email.trim() &&
              !password.trim() &&
              !confirmPassword.trim())
          }
          isLoading={isLoading}
          loadingText="Creating account..."
        >
          Sign up
        </Button>
      </form>
      <GoogleAuthDivider googleAuthHandler={handleGoogleSignIn} />
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
