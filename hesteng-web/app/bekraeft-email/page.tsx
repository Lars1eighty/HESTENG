"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type VerificationState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailShell state={{ status: "loading", message: "Bekræfter e-mail..." }} />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const hasSubmitted = useRef(false);
  const [state, setState] = useState<VerificationState>(() => (
    token
      ? { status: "loading", message: "Bekræfter e-mail..." }
      : { status: "error", message: "Bekræftelseslinket er ugyldigt eller udløbet." }
  ));

  useEffect(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    if (!token) {
      return;
    }

    async function verifyEmail() {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState({
          status: "error",
          message: typeof result.error === "string" ? result.error : "Bekræftelseslinket er ugyldigt eller udløbet.",
        });
        return;
      }

      setState({
        status: "success",
        message: typeof result.message === "string" ? result.message : "Din e-mail er bekræftet.",
      });
    }

    verifyEmail().catch(() => {
      setState({ status: "error", message: "E-mailen kunne ikke bekræftes lige nu." });
    });
  }, [token]);

  return <ConfirmEmailShell state={state} />;
}

function ConfirmEmailShell({ state }: { state: VerificationState }) {
  const isSuccess = state.status === "success";
  const isLoading = state.status === "loading";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <div className="text-3xl font-black text-orange-500">HESTENG</div>
            <div className="text-sm font-semibold text-gray-400">Measure. Improve. Compete.</div>
          </Link>
          <Link href="/login" className="rounded-full border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-500 hover:text-orange-300">
            Log ind
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-14">
          <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
            <div className="text-sm font-black uppercase tracking-[0.32em] text-orange-400">E-mail</div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              {isSuccess ? "Din e-mail er bekræftet." : isLoading ? "Bekræfter e-mail..." : "Linket virker ikke"}
            </h1>
            <p className={`mt-4 text-sm font-semibold leading-6 ${isSuccess ? "text-emerald-300" : isLoading ? "text-gray-400" : "text-red-300"}`}>
              {state.message}
            </p>

            <Link
              href="/login"
              className="mt-7 inline-flex rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 transition hover:bg-orange-400"
            >
              Gå til login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
