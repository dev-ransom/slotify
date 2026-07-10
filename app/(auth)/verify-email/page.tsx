import { EmailVerificationNotice } from "@/components/auth/Emailverificationnotice";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <EmailVerificationNotice email={searchParams.email} />
    </div>
  );
}
