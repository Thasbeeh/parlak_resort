"use client";

import * as React from "react";
import { HallInquiryEngine, type HallInquiryEngineProps } from "./HallInquiryEngine";

export type HallBookingEngineProps = HallInquiryEngineProps;

/**
 * HallBookingEngine wraps HallInquiryEngine for backward compatibility.
 * 
 * Features:
 * - Morning Slot vs Evening Slot selection
 * - attachedDomeRequested bundling
 * - Swimming pool access is strictly excluded under all circumstances
 * - Verify via WhatsApp routing
 */
export function HallBookingEngine(props: HallBookingEngineProps) {
  return <HallInquiryEngine {...props} />;
}

export { HallInquiryEngine };
export default HallBookingEngine;
