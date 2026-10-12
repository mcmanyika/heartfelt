import { z } from "zod";
import { PACKAGE_PLANS } from "@/lib/billing/plans";

export const packagePlanSchema = z.enum(PACKAGE_PLANS);
