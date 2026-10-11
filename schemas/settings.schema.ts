import { z } from 'zod';

export const resortProfileSchema = z.object({
  resortName: z
    .string()
    .trim()
    .min(1, 'Resort name is required')
    .max(100, 'Resort name cannot exceed 100 characters'),
  tagline: z.string().trim().max(160).optional().default(''),
  phone: z
    .string()
    .trim()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number cannot exceed 20 characters'),
  whatsapp: z
    .string()
    .trim()
    .min(10, 'WhatsApp number must be at least 10 digits')
    .max(20, 'WhatsApp number cannot exceed 20 characters'),
  email: z.string().trim().email('Invalid email address'),
  address: z
    .string()
    .trim()
    .min(5, 'Property address is required')
    .max(255, 'Address cannot exceed 255 characters'),
  overnightCheckIn: z.string().trim().min(1, 'Overnight check-in time is required'),
  overnightCheckOut: z.string().trim().min(1, 'Overnight check-out time is required'),
  daySlotCheckIn: z.string().trim().min(1, 'Day slot check-in time is required'),
  daySlotCheckOut: z.string().trim().min(1, 'Day slot check-out time is required'),
  diningUntil: z.string().trim().min(1, 'Dining hours are required'),
  poolUntil: z.string().trim().min(1, 'Pool operating hours are required'),
});

export type ResortProfileInput = z.infer<typeof resortProfileSchema>;
