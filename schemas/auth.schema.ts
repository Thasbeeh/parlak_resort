import { z } from "zod";

export const adminLoginSchema = z
  .object({
    username: z.string().optional(),
    usernameOrEmail: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine(
    (data) =>
      Boolean(
        (data.username && data.username.trim().length > 0) ||
          (data.usernameOrEmail && data.usernameOrEmail.trim().length > 0)
      ),
    {
      message: "Username is required",
      path: ["username"],
    }
  )
  .transform((data) => ({
    username: (data.username || data.usernameOrEmail || "").trim(),
    password: data.password,
  }));

export type AdminLoginInput = {
  username?: string;
  usernameOrEmail?: string;
  password: string;
};
