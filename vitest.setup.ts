import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// Load .env.local so integration tests (e.g. RLS) have real credentials locally.
config({ path: ".env.local" });
config({ path: ".env" });
