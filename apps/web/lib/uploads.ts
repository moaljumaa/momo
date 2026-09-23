import path from "path";

// Where user uploads live. Logos and avatars are served back by app/uploads/[kind]/[file]
// (Next won't serve files added to public/ after the build), source originals are private.
// In Docker this is a mounted volume.
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
export const publicUploadDir = (kind: "logos" | "avatars") => path.join(UPLOADS_DIR, kind);
