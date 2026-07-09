import { neon } from "@neondatabase/serverless";

// Requiere la variable de entorno DATABASE_URL configurada en Vercel
// (Neon la entrega al crear el proyecto / integración).
export const sql = neon(process.env.DATABASE_URL!);
