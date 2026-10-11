"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { adminLoginSchema, type AdminLoginInput } from "../schemas/auth.schema";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "super-secret-jwt-key-change-in-production"
);

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function loginAdmin(
  input: AdminLoginInput | FormData
): Promise<AuthResult> {
  try {
    let parsedData: { username: string; password: string };

    if (input instanceof FormData) {
      const raw = {
        username: input.get("username")?.toString() || "",
        usernameOrEmail: input.get("usernameOrEmail")?.toString() || "",
        password: input.get("password")?.toString() || "",
      };
      const validation = adminLoginSchema.safeParse(raw);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid input",
        };
      }
      parsedData = validation.data;
    } else {
      const validation = adminLoginSchema.safeParse(input);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid input",
        };
      }
      parsedData = validation.data;
    }

    const { username, password } = parsedData;

    // Retrieve admin record from database
    const admin = await db.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    // Sign JWT session token via Web Crypto jose
    const token = await new SignJWT({
      adminId: admin.id,
      username: admin.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  } catch (error) {
    console.error("loginAdmin error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
    };
  }
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  redirect("/admin/login");
}

export async function getCurrentAdmin(): Promise<{
  id: string;
  username: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: (payload.adminId as string) || "",
      username: (payload.username as string) || "",
    };
  } catch {
    return null;
  }
}
