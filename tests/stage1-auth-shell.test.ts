import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminLoginSchema } from "../schemas/auth.schema";
import { loginAdmin, logoutAdmin, getCurrentAdmin } from "../actions/auth";
import { middleware } from "../middleware";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
  headers: vi.fn(async () => ({
    get: vi.fn(() => null),
  })),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  usePathname: () => "/admin/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Stage 1: Design System Foundations, Global Shell & Edge Auth Border", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. adminLoginSchema Validation", () => {
    it("accepts valid username and password", () => {
      const result = adminLoginSchema.safeParse({
        username: "admin1",
        password: "password123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe("admin1");
        expect(result.data.password).toBe("password123");
      }
    });

    it("trims whitespace from username", () => {
      const result = adminLoginSchema.safeParse({
        username: "  admin2  ",
        password: "password123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe("admin2");
      }
    });

    it("rejects empty username", () => {
      const result = adminLoginSchema.safeParse({
        username: "   ",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/Username is required/i);
      }
    });

    it("rejects empty password", () => {
      const result = adminLoginSchema.safeParse({
        username: "admin1",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/Password is required/i);
      }
    });
  });

  describe("2. Server Action: loginAdmin", () => {
    it("authenticates valid credentials and issues admin_token cookie", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      vi.spyOn(db.admin, "findUnique").mockResolvedValueOnce({
        id: "mock-admin-uuid",
        username: "admin1",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await loginAdmin({
        username: "admin1",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockCookieStore.set).toHaveBeenCalledTimes(1);

      const [cookieName, tokenValue, cookieOptions] = mockCookieStore.set.mock.calls[0];
      expect(cookieName).toBe("admin_token");
      expect(typeof tokenValue).toBe("string");
      expect(tokenValue.length).toBeGreaterThan(20);
      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe("lax");
      expect(cookieOptions.path).toBe("/");
    });

    it("rejects incorrect password without throwing unhandled exceptions", async () => {
      const hashedPassword = await bcrypt.hash("correct-password", 10);
      vi.spyOn(db.admin, "findUnique").mockResolvedValueOnce({
        id: "mock-admin-uuid",
        username: "admin1",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await loginAdmin({
        username: "admin1",
        password: "wrong-password",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid username or password");
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("rejects non-existent admin username without throwing unhandled exceptions", async () => {
      vi.spyOn(db.admin, "findUnique").mockResolvedValueOnce(null);

      const result = await loginAdmin({
        username: "unknown_user",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid username or password");
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("handles FormData input correctly", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      vi.spyOn(db.admin, "findUnique").mockResolvedValueOnce({
        id: "mock-admin-uuid",
        username: "admin2",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const formData = new FormData();
      formData.set("username", "admin2");
      formData.set("password", "password123");

      const result = await loginAdmin(formData);
      expect(result.success).toBe(true);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "admin_token",
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });
  });

  describe("3. Server Action: logoutAdmin", () => {
    it("clears admin_token cookie and redirects to /admin/login", async () => {
      await expect(logoutAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
      expect(mockCookieStore.delete).toHaveBeenCalledWith("admin_token");
      expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
    });
  });

  describe("4. Edge Auth Border Middleware", () => {
    const SECRET = new TextEncoder().encode(
      process.env.ADMIN_JWT_SECRET || "super-secret-jwt-key-change-in-production"
    );

    it("allows unauthenticated access to /admin/login", async () => {
      const request = new NextRequest("http://localhost:3000/admin/login");
      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects unauthenticated requests from /admin/dashboard to /admin/login", async () => {
      const request = new NextRequest("http://localhost:3000/admin/dashboard");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it("redirects unauthenticated requests from /admin to /admin/login", async () => {
      const request = new NextRequest("http://localhost:3000/admin");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it("redirects invalid JWT token to /admin/login", async () => {
      const request = new NextRequest("http://localhost:3000/admin/dashboard", {
        headers: {
          cookie: "admin_token=invalid.tampered.jwt",
        },
      });
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
    });

    it("allows valid JWT token through to /admin/dashboard", async () => {
      const token = await new SignJWT({
        adminId: "admin-uuid",
        username: "admin1",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET);

      const request = new NextRequest("http://localhost:3000/admin/dashboard", {
        headers: {
          cookie: `admin_token=${token}`,
        },
      });
      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-pathname")).toBe("/admin/dashboard");
    });
  });

  describe("5. getCurrentAdmin Helper", () => {
    const SECRET = new TextEncoder().encode(
      process.env.ADMIN_JWT_SECRET || "super-secret-jwt-key-change-in-production"
    );

    it("returns null when no cookie is present", async () => {
      mockCookieStore.get.mockReturnValueOnce(undefined);
      const admin = await getCurrentAdmin();
      expect(admin).toBeNull();
    });

    it("returns decoded admin data when valid cookie is present", async () => {
      const token = await new SignJWT({
        adminId: "admin-123",
        username: "admin1",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(SECRET);

      mockCookieStore.get.mockReturnValueOnce({ value: token });
      const admin = await getCurrentAdmin();
      expect(admin).toEqual({
        id: "admin-123",
        username: "admin1",
      });
    });
  });
});
