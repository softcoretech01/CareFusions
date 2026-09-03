"""Stops the same investigation being ordered twice for the same patient.

Pressing "Update EMR" a second time re-submitted the visit's whole order list,
and every submission created a fresh Lab_Order / Rad_Order. Patient
UHID-2026-0016 ended up with "Urine Routine" ordered FIVE times and a CT twice
from a single entry by the doctor -- five lab orders, five service orders, and
five rows for the PRO desk to price and bill.

The consultation screen did try to dedupe, but on the client and against React
state that lags the POST it just made: `globalOrders` is refreshed
asynchronously, so a second click landing before that refresh saw no existing
order and sent everything again. Three separate call sites (the Update EMR
button, a 2-second debounce, and the admission handler) could all be in flight
at once. Client-side dedupe over async state cannot be made reliable; this is
the server-side rule that actually holds.

The key is (patient, test name, calendar day), ignoring tests that were
cancelled. That matches what the screen was reaching for -- a repeat of the same
test on a LATER day is legitimate clinical work and still goes through, while
re-submitting today's list is a no-op.
"""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import text
from sqlalchemy.orm import Session


def _norm(name) -> str:
    """Compare test names the way a human would: case- and space-insensitively."""
    return " ".join(str(name or "").split()).casefold()


def already_ordered_today(db: Session, *, order_table: str, test_table: str,
                          uhid: str, test_names: Iterable[str]) -> set:
    """The subset of ``test_names`` already on a live order for this patient today.

    Returned normalised, so callers must compare with :func:`_norm`. Cancelled
    tests do not count -- a test that was cancelled may legitimately be
    re-ordered.
    """
    wanted = {_norm(n) for n in test_names if _norm(n)}
    if not wanted or not uhid:
        return set()

    rows = db.execute(text(f"""
        SELECT t.TestName
        FROM hospital.{test_table} t
        JOIN hospital.{order_table} h ON h.OrderId = t.OrderId
        WHERE h.Uhid = :uhid
          AND DATE(h.OrderedAt) = CURDATE()
          AND UPPER(COALESCE(t.Status, '')) <> 'CANCELLED'
    """), {"uhid": uhid}).fetchall()

    existing = {_norm(r.TestName) for r in rows}
    return wanted & existing


def split_new_tests(db: Session, *, order_table: str, test_table: str,
                    uhid: str, tests: list, name_of) -> tuple[list, list]:
    """Partition ``tests`` into (not yet ordered today, already ordered today).

    ``name_of`` extracts the test name from one element, so this works for both
    the lab and radiology request shapes without either having to know about the
    other.
    """
    dup = already_ordered_today(
        db, order_table=order_table, test_table=test_table,
        uhid=uhid, test_names=[name_of(t) for t in tests],
    )
    fresh, repeats = [], []
    for t in tests:
        (repeats if _norm(name_of(t)) in dup else fresh).append(t)
    return fresh, repeats


def existing_order_for(db: Session, *, order_table: str, test_table: str,
                       uhid: str, test_names: Iterable[str]):
    """The most recent live order today that already carries one of these tests.

    Returned so a duplicate submission can be answered with the order that
    already exists, rather than with an error the screen would have to interpret
    or a new order it must not create.
    """
    names = [n for n in {_norm(n) for n in test_names} if n]
    if not names or not uhid:
        return None
    row = db.execute(text(f"""
        SELECT h.OrderId, h.OrderNumber
        FROM hospital.{order_table} h
        JOIN hospital.{test_table} t ON t.OrderId = h.OrderId
        WHERE h.Uhid = :uhid
          AND DATE(h.OrderedAt) = CURDATE()
          AND UPPER(COALESCE(t.Status, '')) <> 'CANCELLED'
          AND LOWER(TRIM(t.TestName)) IN :names
        ORDER BY h.OrderId DESC
        LIMIT 1
    """), {"uhid": uhid, "names": tuple(names)}).fetchone()
    return row
