"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
      className="mb-8 rounded-xl border border-gray-700 px-4 py-2 text-gray-300 hover:border-orange-500 hover:text-white"
    >
      ← Tilbage
    </button>
  );
}
