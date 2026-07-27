import { ResetPasswordForm } from "@/components/auth/Resetpasswordform";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-neutral-400 py-20">Loading...</div>
      }
    >
      <div className="h-full pt-20 flex items-center justify-center px-4">
        <ResetPasswordForm />
      </div>
    </Suspense>
  );
}
