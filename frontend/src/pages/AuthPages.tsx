import { SignIn, SignUp } from "@clerk/react";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70dvh] items-center justify-center px-4 py-10" data-testid="auth-page">{children}</div>;
}

export function SignInPage() {
  return (
    <Shell>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
    </Shell>
  );
}

export function SignUpPage() {
  return (
    <Shell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </Shell>
  );
}
