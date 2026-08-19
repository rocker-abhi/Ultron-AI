import os
import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

# Resolve base server directory and ensure 'logs/' exists
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Current active log file path
LOG_FILE = LOGS_DIR / "app.log"

# Define log message layout
LOG_FORMAT = logging.Formatter(
    "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Initialize application logger instance
logger = logging.getLogger("ultron_app")
logger.setLevel(logging.INFO)

# Timed rotating file handler (rotates daily at midnight, suffixing historical logs with the date)
file_handler = TimedRotatingFileHandler(
    filename=str(LOG_FILE),
    when="midnight",
    interval=1,
    backupCount=30,
    encoding="utf-8"
)
file_handler.setFormatter(LOG_FORMAT)
file_handler.suffix = "%Y-%m-%d"

# Console stream handler to mirror stdout log output
console_handler = logging.StreamHandler()
console_handler.setFormatter(LOG_FORMAT)

# Bind handlers once
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

# Log initial bootstrap event
logger.info("Logger initialized successfully. Logs are saved daily in 'logs/' folder.")
