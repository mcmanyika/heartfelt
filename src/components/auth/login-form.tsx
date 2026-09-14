"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAction } from "@/lib/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/validators/auth.schema";

type LoginFormProps = {
  nextPath?: string | null;
  initialMessage?: string | null;
};

export function LoginForm({ nextPath, initialMessage }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values, nextPath);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
      {initialMessage ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy">
          {initialMessage}
        </p>
      ) : null}

      {serverError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {serverError}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-navy">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none ring-maroon/30 transition focus:border-maroon focus:ring-2 disabled:bg-gray-50"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-red-700">{errors.email.message}</p>
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
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none ring-maroon/30 transition focus:border-maroon focus:ring-2 disabled:bg-gray-50"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-red-700">{errors.password.message}</p>
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
  );
}
