import { PGlite } from "@electric-sql/pglite";
import { cp, mkdtemp, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { localPostgresOptions } from "../src/lib/local-postgres-options.mjs";

// initdb temporarily loads several WASM engines. Prepare an empty database
// during the build, where the memory limit is larger than the web service's.
// This template contains no salon data, customer information or credentials.
const directory = await mkdtemp(join(tmpdir(), "fab-postgres-template-"));
const output = resolve(".next/local-postgres");
const local = new PGlite(directory, localPostgresOptions);
try {
  await local.waitReady;
  await local.close();
  await rm(`${output}.tmp`, { recursive: true, force: true });
  await cp(directory, `${output}.tmp`, { recursive: true, errorOnExist: true, force: false });
  await rm(output, { recursive: true, force: true });
  await rename(`${output}.tmp`, output);
  console.log("Empty local PostgreSQL template prepared for startup.");
} finally {
  if (!local.closed) await local.close();
  await rm(directory, { recursive: true, force: true });
}
