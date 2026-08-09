"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-8 rounded-xl border border-gray-700 px-4 py-2 text-gray-300 hover:border-orange-500 hover:text-white"
    >
      ← Tilbage
    </button>
  );
}
