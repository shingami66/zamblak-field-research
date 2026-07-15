"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginActionState } from "@/app/login/actions";

const EMPTY_LOGIN_STATE: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-14 w-full rounded-lg bg-[#A8E10C] px-5 text-lg font-bold text-[#102A2B] transition-colors duration-200 hover:bg-[#98CC0B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F3D3E]/25 focus-visible:ring-offset-2 active:bg-[#8FBE0A] disabled:cursor-not-allowed disabled:bg-[#DCE5C4] disabled:text-[#52605F] motion-reduce:transition-none"
    >
      {pending ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

type LoginFormProps = {
  initialError?: string | null;
};

export function LoginForm({ initialError = null }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, EMPTY_LOGIN_STATE);
  const errorMessage = state.error ?? initialError;

  return (
    <div className="w-full rounded-2xl border border-[#C0C8C8] bg-white p-[clamp(1.25rem,3vw,2.5rem)]">
      <form
        action={formAction}
        className="space-y-5 sm:space-y-6"
        noValidate
        aria-describedby={errorMessage ? "login-error" : undefined}
      >
        <div className="space-y-2.5">
          <label
            htmlFor="email"
            className="block text-lg font-medium leading-7 text-[#102A2B]"
          >
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-14 w-full rounded-lg border border-[#AEB7B6] bg-[#FDFEFE] ps-4 pe-4 text-left text-lg text-[#102A2B] outline-none transition-colors duration-200 hover:border-[#717978] focus-visible:border-[#0F3D3E] focus-visible:ring-4 focus-visible:ring-[#0F3D3E]/15 motion-reduce:transition-none"
            dir="ltr"
          />
        </div>

        <div className="space-y-2.5">
          <label
            htmlFor="password"
            className="block text-lg font-medium leading-7 text-[#102A2B]"
          >
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-14 w-full rounded-lg border border-[#AEB7B6] bg-[#FDFEFE] ps-4 pe-4 text-left text-lg text-[#102A2B] outline-none transition-colors duration-200 hover:border-[#717978] focus-visible:border-[#0F3D3E] focus-visible:ring-4 focus-visible:ring-[#0F3D3E]/15 motion-reduce:transition-none"
            dir="ltr"
          />
        </div>

        {errorMessage ? (
          <div
            id="login-error"
            role="alert"
            aria-atomic="true"
            className="rounded-lg border border-[#BA1A1A] bg-[#FFF5F3] px-4 py-3.5 text-[1.0625rem] leading-7 text-[#93000A]"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="pt-1 sm:pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
