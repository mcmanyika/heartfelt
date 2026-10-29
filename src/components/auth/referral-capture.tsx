"use client";

import { useEffect, useRef } from "react";
import { captureReferralAction } from "@/lib/services/affiliate.actions";

type ReferralCaptureProps = {
  code: string;
};

export function ReferralCapture({ code }: ReferralCaptureProps) {
  const captured = useRef(false);

  useEffect(() => {
    if (!code || captured.current) {
      return;
    }
    captured.current = true;
    void captureReferralAction(code);
  }, [code]);

  return null;
}
