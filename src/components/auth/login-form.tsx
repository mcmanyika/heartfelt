"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginAction,
  requestMobileLoginOtpAction,
  verifyMobileLoginOtpAction,
} from "@/lib/auth/actions";
import {
  loginSchema,
  mobileLoginRequestSchema,
  mobileLoginVerifySchema,
  type LoginInput,
  type MobileLoginRequestInput,
  type MobileLoginVerifyInput,
} from "@/lib/validators/auth.schema";
import { fieldClassName } from "@/components/ui/form-field";
import { cn } from "@/lib/utils/cn";

type LoginMethod = "email" | "mobile";

type LoginFormProps = {
  nextPath?: string | null;
  initialMessage?: string | null;
};

export function LoginForm({ nextPath, initialMessage }: LoginFormProps) {
  const [method, setMethod] = useState<LoginMethod>("email");
  const [serverError, setServerError] = useState<string | null>(null);
  const [mobileNotice, setMobileNotice] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const emailForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const phoneForm = useForm<MobileLoginRequestInput>({
    resolver: zodResolver(mobileLoginRequestSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<MobileLoginVerifyInput>({
    resolver: zodResolver(mobileLoginVerifySchema),
    defaultValues: { phone: "", token: "" },
  });

  function switchMethod(next: LoginMethod) {
    setMethod(next);
    setServerError(null);
    setMobileNotice(null);
    if (next === "email") {
      setOtpPhone(null);
      otpForm.reset({ phone: "", token: "" });
    }
  }

  function onEmailSubmit(values: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values, nextPath);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  function onRequestCode(values: MobileLoginRequestInput) {
    setServerError(null);
    setMobileNotice(null);
    startTransition(async () => {
      const result = await requestMobileLoginOtpAction(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      if (result?.ok && result.phone) {
        setOtpPhone(result.phone);
        otpForm.reset({ phone: result.phone, token: "" });
        setMobileNotice(`We sent a 6-digit code to ${result.phone}.`);
      }
    });
  }

  function onVerifyCode(values: MobileLoginVerifyInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await verifyMobileLoginOtpAction(values, nextPath);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  function onResendCode() {
    const phone = otpPhone ?? phoneForm.getValues("phone");
    if (!phone) {
      return;
    }
    onRequestCode({ phone });
  }

  return (
    <div className="mt-8">
      <div
        className="grid grid-cols-2 rounded-lg border border-border bg-background p-1"
        role="tablist"
        aria-label="Sign-in method"
      >
        <button
          type="button"
          role="tab"
          aria-selected={method === "email"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-semibold transition",
            method === "email" ? "bg-navy text-white shadow-sm" : "text-navy hover:bg-card",
          )}
          onClick={() => switchMethod("email")}
        >
          Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "mobile"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-semibold transition",
            method === "mobile" ? "bg-navy text-white shadow-sm" : "text-navy hover:bg-card",
          )}
          onClick={() => switchMethod("mobile")}
        >
          Mobile
        </button>
      </div>

      {initialMessage ? (
        <p className="mt-5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy">
          {initialMessage}
        </p>
      ) : null}

      {mobileNotice && method === "mobile" ? (
        <p className="mt-5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy">
          {mobileNotice}
        </p>
      ) : null}

      {serverError ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {serverError}
        </p>
      ) : null}

      {method === "email" ? (
        <form
          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
          className="mt-5 space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-navy">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              className={fieldClassName}
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email ? (
              <p className="text-sm text-red-700">{emailForm.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-navy">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              className={fieldClassName}
              {...emailForm.register("password")}
            />
            {emailForm.formState.errors.password ? (
              <p className="text-sm text-red-700">{emailForm.formState.errors.password.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : otpPhone ? (
        <form
          onSubmit={otpForm.handleSubmit(onVerifyCode)}
          className="mt-5 space-y-5"
          noValidate
        >
          <input type="hidden" {...otpForm.register("phone")} />
          <div className="space-y-1.5">
            <label htmlFor="token" className="block text-sm font-medium text-navy">
              Verification code
            </label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={isPending}
              className={`${fieldClassName} tracking-[0.35em]`}
              placeholder="••••••"
              {...otpForm.register("token")}
            />
            {otpForm.formState.errors.token ? (
              <p className="text-sm text-red-700">{otpForm.formState.errors.token.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Verifying..." : "Verify and sign in"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="font-medium text-maroon hover:underline disabled:opacity-70"
              disabled={isPending}
              onClick={onResendCode}
            >
              Resend code
            </button>
            <button
              type="button"
              className="font-medium text-navy hover:underline disabled:opacity-70"
              disabled={isPending}
              onClick={() => {
                setOtpPhone(null);
                setMobileNotice(null);
                setServerError(null);
                otpForm.reset({ phone: "", token: "" });
              }}
            >
              Change number
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={phoneForm.handleSubmit(onRequestCode)}
          className="mt-5 space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-medium text-navy">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              disabled={isPending}
              className={fieldClassName}
              placeholder="+263 77 123 4567"
              {...phoneForm.register("phone")}
            />
            <p className="text-xs text-gray-500">
              Use the number on your member profile. Include country code if you can.
            </p>
            {phoneForm.formState.errors.phone ? (
              <p className="text-sm text-red-700">{phoneForm.formState.errors.phone.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#761834] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Sending code..." : "Send code"}
          </button>
        </form>
      )}
    </div>
  );
}
