from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
import traceback

class AppException(Exception):
    """Custom application exception for business logic errors."""
    def __init__(self, message: str, status_code: int = 400, error_details: any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_details = error_details

def register_exception_handlers(app: FastAPI):
    """Register unified JSON exception handlers on the FastAPI application."""

    # 1. Custom business AppException handler
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": None,
                "error": exc.error_details
            }
        )

    # 2. Standard FastAPI/Starlette HTTPException handler
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail,
                "data": None,
                "error": None
            }
        )

    # 3. Pydantic request validation error handler
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation failed for request parameters.",
                "data": None,
                "error": exc.errors()
            }
        )

    # 4. SQLAlchemy/Database exception handler
    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        # Extract base database error message securely
        db_err = str(exc.__dict__.get("orig", str(exc)))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Database query or connection failure occurred.",
                "data": None,
                "error": db_err
            }
        )

    # 5. Fallback unhandled Exception handler
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        # Print raw exception stack trace for console debugging
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected server error occurred.",
                "data": None,
                "error": str(exc)
            }
        )
