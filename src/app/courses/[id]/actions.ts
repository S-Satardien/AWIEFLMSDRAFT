"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface CheckoutPayload {
  courseId: string;
  gateway: "PAYFAST" | "PAYPAL" | "PAYSTACK" | "FLUTTERWAVE" | "SCHOLARSHIP";
  currency?: string;
  amountZar?: number;
  amountOriginal?: number;
  gatewayFeeZar?: number;
  netAmountZar?: number;
  authorRoyaltyZar?: number;
  awiefShareZar?: number;
  paymentDetail?: string;
  scholarshipCode?: string;
}

const VALID_VOUCHERS = new Set(["AWIEF-JNJ-DEMO", "AWIEF-SCHOLAR-2026"]);

/**
 * Enrolls an authenticated learner directly ONLY if the course is free/sponsored
 * (or the user is an Admin). Prevents bypassing paid checkout on commercial courses.
 */
export async function enrollInCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";

  if (!userId) {
    return { success: false, redirectUrl: `/login?callbackUrl=/courses/${courseId}` };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, isFree: true, isPublished: true },
  });

  if (!course || (!course.isPublished && role !== "ADMIN")) {
    return { success: false, redirectUrl: `/catalog` };
  }

  if (!course.isFree && role !== "ADMIN") {
    return {
      success: false,
      redirectUrl: `/courses/${courseId}?checkout=true`,
    };
  }

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {
      lastAccess: new Date(),
    },
    create: {
      userId,
      courseId,
      status: "IN_PROGRESS",
    },
  });

  await logAuditEvent({
    actorId: userId,
    action: "ENROLL_FREE_COURSE",
    targetType: "Course",
    targetId: courseId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath("/catalog");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/course/${courseId}`);

  return { success: true, redirectUrl: `/course/${courseId}` };
}

/**
 * Authoritatively computes course pricing, gateway fees, and author royalty split on the server
 * from the stored Course record (never trusting client-submitted financial figures),
 * validates sponsor/grant vouchers, records the Transaction, and activates Enrollment.
 */
export async function processCourseCheckout(payload: CheckoutPayload) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      success: false,
      redirectUrl: `/login?callbackUrl=/courses/${payload.courseId}?checkout=true`,
      error: "Please sign in or register to complete your enrollment.",
    };
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: payload.courseId },
      select: {
        id: true,
        priceZar: true,
        priceUsd: true,
        isFree: true,
        royaltyRate: true,
        isPublished: true,
      },
    });

    if (!course || !course.isPublished) {
      return { success: false, error: "Requested masterclass is not available." };
    }

    const isGrant = payload.gateway === "SCHOLARSHIP" || course.isFree;
    if (payload.gateway === "SCHOLARSHIP" && !course.isFree) {
      const code = (payload.scholarshipCode || "").trim().toUpperCase();
      if (!VALID_VOUCHERS.has(code)) {
        return {
          success: false,
          error: "Invalid or expired scholarship voucher code.",
        };
      }
    }

    const currency = isGrant
      ? "ZAR"
      : payload.gateway === "PAYPAL"
      ? "USD"
      : "ZAR";
    const amountZar = isGrant ? 0 : course.priceZar;
    const amountOriginal = isGrant
      ? 0
      : currency === "USD"
      ? course.priceUsd
      : course.priceZar;

    let gatewayFeeZar = 0;
    if (!isGrant) {
      if (payload.gateway === "PAYFAST") {
        gatewayFeeZar = Math.round(amountZar * 0.035 + 2.0);
      } else if (payload.gateway === "PAYPAL") {
        gatewayFeeZar = Math.round(amountZar * 0.044 + 5.5);
      } else {
        gatewayFeeZar = Math.round(amountZar * 0.029 + 1.0);
      }
    }

    const netAmountZar = Math.max(0, amountZar - gatewayFeeZar);
    const royaltyPct = course.royaltyRate ?? 35;
    const authorRoyaltyZar = isGrant ? 0 : Math.round(netAmountZar * (royaltyPct / 100));
    const awiefShareZar = isGrant ? 0 : netAmountZar - authorRoyaltyZar;

    const now = new Date();
    const billingMonth = now.toISOString().slice(0, 7);
    const reference = `AWIEF-${payload.gateway.substring(0, 3)}-${Date.now()}`;

    await prisma.transaction.create({
      data: {
        reference,
        userId,
        courseId: course.id,
        gateway: isGrant ? "SCHOLARSHIP" : payload.gateway,
        currency,
        amountZar,
        amountOriginal,
        gatewayFeeZar,
        netAmountZar,
        royaltyRateSnapshot: royaltyPct,
        authorRoyaltyZar,
        awiefShareZar,
        billingMonth,
        status: "COMPLETED",
        paymentMethodDetail:
          (payload.paymentDetail || `${payload.gateway} Gateway Settlement`).slice(0, 140),
      },
    });

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      update: {
        lastAccess: new Date(),
      },
      create: {
        userId,
        courseId: course.id,
        status: "IN_PROGRESS",
        progress: 0,
      },
    });

    await logAuditEvent({
      actorId: userId,
      action: isGrant ? "CHECKOUT_SCHOLARSHIP" : "CHECKOUT_PAID",
      targetType: "Course",
      targetId: course.id,
      details: `ref=${reference}, amountZar=${amountZar}, gateway=${payload.gateway}`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");
    revalidatePath("/catalog");
    revalidatePath(`/courses/${course.id}`);
    revalidatePath(`/course/${course.id}`);
    revalidatePath("/admin");

    return { success: true, redirectUrl: `/course/${course.id}` };
  } catch (error: unknown) {
    console.error("Error processing course checkout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process course checkout.",
    };
  }
}
