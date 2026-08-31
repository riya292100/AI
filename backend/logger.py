"""Structured logging configuration for LifeOS."""
import logging
import sys

try:
    try:
        from pythonjsonlogger.json import JsonFormatter
    except ImportError:
        from pythonjsonlogger.jsonlogger import JsonFormatter

    HAS_JSON_LOGGER = True
except ImportError:
    HAS_JSON_LOGGER = False


def setup_logger(name: str = "lifeos") -> logging.Logger:
    """Configure and return a structured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        if HAS_JSON_LOGGER:
            formatter = JsonFormatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s %(pathname)s %(lineno)d"
            )
            handler.setFormatter(formatter)
        else:
            formatter = logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
            )
            handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


logger = setup_logger("lifeos")
