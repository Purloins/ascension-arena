// src/app/api/auth/[...nextauth]/route.ts
// Handles all /api/auth/* routes.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
