"""Export standings in CSV, JSON, and PDF formats."""

import csv
import io
import json
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tournament import Tournament, Player

router = APIRouter(prefix="/api/v1/tournaments/{slug}/export", tags=["export"])


async def _get_tournament(db: AsyncSession, slug: str) -> Tournament:
    from app.api.tournaments import _get_tournament as _gt
    return await _gt(db, slug)


async def _get_standings_data(
    db: AsyncSession, slug: str, sort_by: str = "rating"
) -> tuple[Tournament, list[dict]]:
    t = await _get_tournament(db, slug)
    result = await db.execute(
        select(Player).where(Player.tournament_id == t.id)
    )
    players = list(result.scalars().all())

    if sort_by == "elo":
        players.sort(key=lambda p: -p.elo_rating)
    elif sort_by == "win_rate":
        players.sort(key=lambda p: -(p.wins / p.games_played * 100 if p.games_played > 0 else 0))
    else:
        players.sort(key=lambda p: -p.rating)

    rows = []
    for i, p in enumerate(players):
        win_rate = round(p.wins / p.games_played * 100, 1) if p.games_played > 0 else 0.0
        rows.append({
            "rank": i + 1,
            "name": p.name,
            "wins": p.wins,
            "losses": p.losses,
            "games": p.games_played,
            "elo": round(p.elo_rating, 1),
            "points": round(p.rating, 1),
            "win_rate": win_rate,
            "point_diff": p.point_differential,
        })
    return t, rows


@router.get("/standings.csv")
async def export_csv(
    slug: str,
    sort_by: Literal["rating", "elo", "win_rate"] = Query("rating"),
    db: AsyncSession = Depends(get_db),
):
    t, rows = await _get_standings_data(db, slug, sort_by)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "rank", "name", "wins", "losses", "games", "elo", "points", "win_rate", "point_diff"
    ])
    writer.writeheader()
    writer.writerows(rows)

    content = output.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{t.slug}-standings.csv"'},
    )


@router.get("/standings.json")
async def export_json(
    slug: str,
    sort_by: Literal["rating", "elo", "win_rate"] = Query("rating"),
    db: AsyncSession = Depends(get_db),
):
    t, rows = await _get_standings_data(db, slug, sort_by)
    payload = {
        "tournament": {
            "name": t.name,
            "slug": t.slug,
            "status": t.status.value if hasattr(t.status, "value") else t.status,
        },
        "sort_by": sort_by,
        "standings": rows,
    }
    content = json.dumps(payload, indent=2, ensure_ascii=False)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{t.slug}-standings.json"'},
    )


@router.get("/standings.pdf")
async def export_pdf(
    slug: str,
    sort_by: Literal["rating", "elo", "win_rate"] = Query("rating"),
    db: AsyncSession = Depends(get_db),
):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    t, rows = await _get_standings_data(db, slug, sort_by)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=15 * mm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>{t.name}</b> — Standings", styles["Title"]))
    elements.append(Spacer(1, 10))

    header = ["#", "Name", "W", "L", "Games", "Elo", "Pts", "Win%", "+/-"]
    table_data = [header]
    for r in rows:
        table_data.append([
            str(r["rank"]), r["name"], str(r["wins"]), str(r["losses"]),
            str(r["games"]), str(r["elo"]), str(r["points"]),
            f"{r['win_rate']}%", str(r["point_diff"]),
        ])

    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    doc.build(elements)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{t.slug}-standings.pdf"'},
    )
