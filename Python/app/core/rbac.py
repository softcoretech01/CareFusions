"""Role-based access control for the clinical/financial workflow.

Before this module every workflow endpoint was unauthenticated AND
unauthorised: a lab technician could approve a PRO order, a doctor could
collect a payment, and anyone who could reach the port could do both. The login
token has always carried the user's role (see core/tokens.py) -- nothing ever
read it.

Two switches, deliberately separate:

* ``REQUIRE_AUTH`` (existing) decides whether a request must carry a token at
  all. It ships off because unattended scripts in Python/ call the API with no
  credentials.
* ``ENFORCE_RBAC`` (new) decides what happens to a request that arrives with NO
  identity. On -> rejected. Off -> allowed through, but recorded as
  ``UNATTRIBUTED`` so the audit trail says so instead of inventing a user.

A request that DOES carry a valid token is always role-checked, under either
setting. That is the part that matters day to day: the frontend sends the token
on every call, so a signed-in lab user is blocked from PRO approval today,
without waiting for the deployment change that turns REQUIRE_AUTH on.

Role names come from ``admin.Master_User.Role``, which is free text, so they are
matched case- and separator-insensitively against the synonym sets below rather
than by exact string equality.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from app.core.auth_dep import current_user

# Reject unidentified callers outright. Defaults to following REQUIRE_AUTH so
# that turning on authentication turns on authorisation with it.
ENFORCE_RBAC = os.getenv(
    "ENFORCE_RBAC",
    os.getenv("REQUIRE_AUTH", "false"),
).strip().lower() in {"1", "true", "yes", "on"}


def _norm(value: Optional[str]) -> str:
    """Fold a role name to a comparable key: 'Lab Technician' -> 'labtechnician'."""
    return "".join(ch for ch in (value or "").lower() if ch.isalnum())


# Roles that may do anything. Kept small on purpose.
SUPER_ROLES = {_norm(r) for r in ("Super Admin", "Admin", "System Administrator")}

# Every workflow role, with the spellings this deployment is likely to hold.
ROLE_SYNONYMS: dict[str, set[str]] = {
    "DOCTOR": {"doctor", "physician", "consultant", "surgeon", "doctors"},
    "PRO": {"pro", "prouser", "prooffice", "prooofficer", "prooficer",
            "publicrelationofficer", "publicrelationsofficer", "proexecutive"},
    "BILLING": {"billing", "billingmanager", "billingexecutive", "cashier",
                "accounts", "accountant", "frontofficebilling"},
    "LAB": {"lab", "labtechnician", "labtech", "laboratory", "pathologist",
            "labmanager"},
    "RADIOLOGY": {"radiology", "radiologist", "radiologytechnician", "radtech",
                  "imaging"},
    "OT": {"ot", "otstaff", "operationtheatre", "operationtheater", "theatre",
           "anaesthetist", "anesthetist", "surgeon"},
    "NURSE": {"nurse", "nursing", "staffnurse"},
    "INSURANCE": {"insurance", "insurancedesk", "tpa", "tpadesk", "preauth"},
    "RECEPTION": {"reception", "receptionist", "frontoffice", "frontdesk"},
    "IPD": {"ipd", "ipdmanager", "wardmanager", "inpatient"},
}


@dataclass(frozen=True)
class Actor:
    """Who is performing an action, for gate checks and audit columns."""

    username: str
    role: str
    user_id: Optional[int] = None
    authenticated: bool = False

    @property
    def role_key(self) -> str:
        return _norm(self.role)

    def is_super(self) -> bool:
        return self.role_key in SUPER_ROLES

    def has_role(self, *names: str) -> bool:
        if self.is_super():
            return True
        allowed: set[str] = set()
        for name in names:
            allowed |= ROLE_SYNONYMS.get(name, {_norm(name)})
        return self.role_key in allowed


# Used when ENFORCE_RBAC is off and the caller sent no token. Recorded verbatim
# in audit columns so an unattributed action is visibly unattributed.
ANONYMOUS = Actor(username="UNATTRIBUTED", role="UNATTRIBUTED", authenticated=False)


def _actor_from_request(request: Request, payload: Optional[dict]) -> Actor:
    if payload:
        return Actor(
            username=str(payload.get("usr") or "UNKNOWN"),
            role=str(payload.get("role") or ""),
            user_id=payload.get("uid"),
            authenticated=True,
        )
    # The frontend also sends X-User-Name / X-User-Role for the audit
    # middleware. They are not proof of anything (a header is not a signature),
    # so they name the actor but never satisfy a role check.
    header_user = request.headers.get("x-user-name")
    if header_user:
        return Actor(
            username=header_user,
            role=request.headers.get("x-user-role", ""),
            authenticated=False,
        )
    return ANONYMOUS


def get_actor(request: Request, payload: Optional[dict] = Depends(current_user)) -> Actor:
    """Identify the caller without requiring any particular role.

    Use on read endpoints that want to stamp "who looked at this" but should
    stay open to whoever can already reach them.
    """
    return _actor_from_request(request, payload)


def require_roles(*roles: str):
    """Dependency factory: only these roles (plus super-admins) may proceed.

    Returns the :class:`Actor`, so handlers get the audit identity for free::

        @router.post("/orders/{order_id}/approve")
        def approve(order_id: int, actor: Actor = Depends(require_roles("PRO"))):
            ...
    """

    def dependency(request: Request,
                   payload: Optional[dict] = Depends(current_user)) -> Actor:
        actor = _actor_from_request(request, payload)

        if not actor.authenticated:
            if ENFORCE_RBAC:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This action requires a signed-in user.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Open mode: allowed, but the audit row will say UNATTRIBUTED.
            return actor

        if not actor.has_role(*roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{actor.role or 'none'}' is not permitted to perform this "
                    f"action. Allowed: {', '.join(roles)}."
                ),
            )
        return actor

    return dependency
