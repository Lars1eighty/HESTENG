"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  setAdminGuestPreview,
  useAdminGuestPreview,
} from "@/context/CurrentUserContext";

export default function AdminGuestPreviewControl() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isGuestPreview = useAdminGuestPreview();
  const isAdmin = session?.user?.memberships?.some(
    (membership) => membership.role === "ADMIN"
  ) ?? false;

  useEffect(() => {
    if (!isGuestPreview) return;

    if (status === "unauthenticated" || (status === "authenticated" && !isAdmin)) {
      setAdminGuestPreview(false);
    }
  }, [isAdmin, isGuestPreview, status]);

  if (!isGuestPreview || !isAdmin) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setAdminGuestPreview(false);
        router.push("/dashboard");
      }}
      className="fixed right-4 top-4 z-[100] rounded-full border border-orange-400 bg-gray-950 px-4 py-2 text-sm font-black text-orange-300 shadow-xl shadow-black/30 transition hover:bg-orange-500 hover:text-gray-950"
    >
      Tilbage til admin
    </button>
  );
}
