/**
 * PM2 Ecosystem Configuration — MVA Mac Mini M4 Pro Appliance
 *
 * Services:
 *   1. mlx-server    — Apple Silicon LLM inference (port 8080)
 *   2. chromadb      — Vector database for RAG/LTM (port 8001)
 *   3. gantry-backend  — FastAPI chat API (port 8000)
 *   4. gantry-frontend — React UI served via npx serve (port 3000)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 *   pm2 restart all
 *
 * Boot persistence:
 *   pm2 startup launchd
 *   pm2 save
 */

const USER = process.env.USER || 'westailabllc';
const HOME = process.env.HOME || `/Users/${USER}`;
const PROJECTS = `${HOME}/projects`;
const VENV_BASE = `${HOME}/.nebulus/venvs`;
const LOG_DIR = `${HOME}/logs`;

module.exports = {
  apps: [
    // ── 1. MLX Inference Server ──────────────────────────────────
    // Must start first — all other services depend on it.
    {
      name: 'mlx-server',
      script: `${VENV_BASE}/mlx-server/bin/mlx_lm.server`,
      interpreter: 'none',
      args: [
        '--model', 'mlx-community/Qwen2.5-Coder-32B-Instruct-4bit',
        '--host', '0.0.0.0',
        '--port', '8080',
      ].join(' '),
      cwd: HOME,
      env: {
        MLX_METAL_VALIDATION: '0',
      },
      wait_ready: true,
      listen_timeout: 120000, // 2 min — model loading is slow
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '20G', // Large model in unified memory
      autorestart: true,
      watch: false,
      out_file: `${LOG_DIR}/mlx-server-out.log`,
      error_file: `${LOG_DIR}/mlx-server-err.log`,
      merge_logs: true,
      time: true,
    },

    // ── 2. ChromaDB Vector Database ──────────────────────────────
    {
      name: 'chromadb',
      script: `${VENV_BASE}/gantry/bin/chroma`,
      interpreter: 'none',
      args: [
        'run',
        '--host', '0.0.0.0',
        '--port', '8001',
        '--path', `${PROJECTS}/nebulus-gantry/data/chroma`,
      ].join(' '),
      cwd: `${PROJECTS}/nebulus-gantry`,
      env: {
        ANONYMIZED_TELEMETRY: 'false',
      },
      wait_ready: true,
      listen_timeout: 30000,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '2G',
      autorestart: true,
      watch: false,
      out_file: `${LOG_DIR}/chromadb-out.log`,
      error_file: `${LOG_DIR}/chromadb-err.log`,
      merge_logs: true,
      time: true,
    },

    // ── 3. Gantry FastAPI Backend ────────────────────────────────
    {
      name: 'gantry-backend',
      script: `${VENV_BASE}/gantry/bin/uvicorn`,
      interpreter: 'none',
      args: [
        'backend.main:app',
        '--host', '0.0.0.0',
        '--port', '8000',
        '--workers', '2',
      ].join(' '),
      cwd: `${PROJECTS}/nebulus-gantry`,
      env: {
        OVERLORD_ROUTING_ENABLED: 'false',
        NEBULUS_LLM_URL: 'http://localhost:8080',
        BIND_HOST: '0.0.0.0',
        CORS_ORIGINS: '*',
        HTTPS_ENABLED: 'false',
        GANTRY_DATA_DIR: 'data',
        SESSION_EXPIRE_HOURS: '168',
        NEBULUS_CHROMA_URL: 'http://localhost:8001',
        PYTHONPATH: `${PROJECTS}/nebulus-gantry:${PROJECTS}/nebulus-core`,
      },
      wait_ready: true,
      listen_timeout: 30000,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '2G',
      autorestart: true,
      watch: false,
      out_file: `${LOG_DIR}/gantry-backend-out.log`,
      error_file: `${LOG_DIR}/gantry-backend-err.log`,
      merge_logs: true,
      time: true,
    },

    // ── 4. Gantry React Frontend ─────────────────────────────────
    {
      name: 'gantry-frontend',
      script: 'npx',
      interpreter: 'none',
      args: [
        'serve',
        '-s', 'build',
        '-l', '3000',
        '--no-clipboard',
      ].join(' '),
      cwd: `${PROJECTS}/nebulus-gantry/frontend`,
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      out_file: `${LOG_DIR}/gantry-frontend-out.log`,
      error_file: `${LOG_DIR}/gantry-frontend-err.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
