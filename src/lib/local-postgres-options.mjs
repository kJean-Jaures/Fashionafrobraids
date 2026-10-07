// PGlite serves one connection at a time. PostgreSQL's server defaults reserve
// far more memory than this local development / demonstration database needs.
export const localPostgresOptions = {
  postgresqlconf: [
    "shared_buffers=8MB",
    "work_mem=1MB",
    "maintenance_work_mem=16MB",
    "max_connections=10",
  ],
  initDbStartParams: ["--set=shared_buffers=8MB", "--set=max_connections=10"],
};
