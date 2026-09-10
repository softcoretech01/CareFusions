"""Authenticated access to uploaded files.

Uploads were served by a StaticFiles mount at ``/uploads`` which sat on
``AUTH_EXEMPT_PATHS``. Every scanned ID proof, insurance card and result
attachment was therefore downloadable by anyone who could reach the server --
and it would have *stayed* downloadable after REQUIRE_AUTH was switched on,
because the exemption is checked before the token is.

Worse, patient documents were stored as ``<UHID>_<original filename>``, so the
URLs were guessable: anyone who knew the UHID format could walk the directory
without ever listing it.

Files now stream through this endpoint. The token is accepted two ways because
the browser cannot set an Authorization header on ``window.open`` or an
``<img src>``:

* ``Authorization: Bearer <token>`` -- normal fetch/XHR callers;
* ``?token=<token>`` -- link and image callers.

The path is registered in AUTH_EXEMPT_PATHS so the *global* auth dependency lets
it through, and the check is then done here instead. It is not unauthenticated;
it authenticates differently.
"""

import os

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import FileResponse

from app.core.tokens import verify_token

router = APIRouter(prefix="/files", tags=["Files"])

# Anchored to Python/ the same way upload.py anchors it, so both agree on the
# directory whatever uvicorn's working directory happens to be.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="A valid token is required to download this file.",
    headers={"WWW-Authenticate": "Bearer"},
)


def _caller_token(request: Request, token: str | None) -> str | None:
    """The bearer token if one was sent, else the query-string one."""
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return token


def _resolve_inside_uploads(filename: str) -> str:
    """Absolute path for ``filename``, or refuse if it escapes the directory.

    The name arrives from the URL, so ``../`` and absolute paths have to be
    rejected explicitly. Comparing the *resolved* path against the resolved
    upload directory catches the cases a simple substring check misses.
    """
    if not filename or filename in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    if "/" in filename or "\\" in filename or "\x00" in filename:
        raise HTTPException(status_code=400, detail="Invalid file name.")

    root = os.path.realpath(UPLOAD_DIR)
    target = os.path.realpath(os.path.join(root, filename))
    if target != root and not target.startswith(root + os.sep):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    return target


@router.get("/{filename}")
def get_file(
    filename: str,
    request: Request,
    token: str | None = Query(None, description="Token for callers that cannot set a header"),
):
    """Stream an uploaded file to a caller holding a valid token."""
    raw = _caller_token(request, token)
    if not raw or verify_token(raw) is None:
        raise _UNAUTHORIZED

    path = _resolve_inside_uploads(filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found.")

    # inline so a scanned document opens in the browser rather than downloading,
    # which is what every current caller expects from the old static mount.
    return FileResponse(path, content_disposition_type="inline")
