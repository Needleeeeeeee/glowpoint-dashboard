import LogInForm from "@/components/LogInForm";
import Link from "next/link";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-primary-foreground rounded-3xl p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-4">Login</h1>
        <LogInForm />
        <p className="text-center text-sm mt-4">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-primary underline">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
