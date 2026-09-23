"""
db.py
─────
Database layer supporting MongoDB (primary) with automatic SQLite fallback.

MongoDB stores:
  - queries, AI responses, validation results, user history
  - identical to the architecture flowchart

SQLite is used automatically if MongoDB is not running or not installed.
"""

import os
import json
import sqlite3
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB",  "ai_validator")
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "validations.db")


# ── MongoDB client (lazy init) ────────────────────────────────────────────────

_mongo_client = None
_mongo_db     = None
_use_mongo    = False


def _try_init_mongo():
    global _mongo_client, _mongo_db, _use_mongo
    try:
        from pymongo import MongoClient
        from pymongo.errors import ServerSelectionTimeoutError
        client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Ping to check connection
        client.admin.command("ping")
        _mongo_client = client
        _mongo_db     = client[MONGODB_DB]
        _use_mongo    = True
        logger.info("✅ Connected to MongoDB at %s", MONGODB_URL)
    except Exception as e:
        logger.warning("⚠️  MongoDB unavailable (%s) — using SQLite fallback", e)
        _use_mongo = False


# ── SQLite setup ─────────────────────────────────────────────────────────────

def _ensure_sqlite():
    os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS validations (
            id           TEXT PRIMARY KEY,
            timestamp    TEXT NOT NULL,
            query        TEXT,
            ai_response  TEXT,
            reference    TEXT,
            overall_score INTEGER,
            label        TEXT,
            summary      TEXT,
            claims_json  TEXT,
            stats_json   TEXT,
            relevance_json    TEXT,
            accuracy_json     TEXT,
            hallucination_json TEXT,
            completeness_json  TEXT,
            verdict_json       TEXT
        )
    """)
    # Ensure columns exist if table was created in older version
    existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(validations)").fetchall()]
    for col in ["relevance_json", "accuracy_json", "hallucination_json", "completeness_json", "verdict_json"]:
        if col not in existing_cols:
            conn.execute(f"ALTER TABLE validations ADD COLUMN {col} TEXT")
    conn.commit()
    conn.close()


def init_db():
    """Initialise database — called once on startup."""
    _try_init_mongo()
    if not _use_mongo:
        _ensure_sqlite()
    return "mongodb" if _use_mongo else "sqlite"


def get_db_type() -> str:
    return "mongodb" if _use_mongo else "sqlite"


# ── Save validation result ─────────────────────────────────────────────────────

def save_validation(result: Dict[str, Any]) -> str:
    """Persist a full validation result. Returns the record id."""
    record_id = result.get("id") or str(uuid.uuid4())
    result["id"] = record_id

    if _use_mongo:
        _mongo_db["validations"].insert_one({**result, "_id": record_id})
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.execute(
            """INSERT OR REPLACE INTO validations
               (id, timestamp, query, ai_response, reference,
                overall_score, label, summary, claims_json, stats_json,
                relevance_json, accuracy_json, hallucination_json, completeness_json, verdict_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                record_id,
                result.get("timestamp", datetime.utcnow().isoformat()),
                result.get("query", ""),
                result.get("ai_response", ""),
                result.get("reference", ""),
                result.get("overall_score", 0),
                result.get("label", "Unknown"),
                result.get("summary", ""),
                json.dumps(result.get("claims", [])),
                json.dumps(result.get("stats", {})),
                json.dumps(result.get("relevance_eval", {})),
                json.dumps(result.get("accuracy_eval", {})),
                json.dumps(result.get("hallucination_eval", {})),
                json.dumps(result.get("completeness_eval", {})),
                json.dumps(result.get("verdict_eval", {})),
            )
        )
        conn.commit()
        conn.close()

    return record_id


# ── Get all history ────────────────────────────────────────────────────────────

def get_all_history() -> List[Dict]:
    if _use_mongo:
        docs = list(_mongo_db["validations"].find({}, {"_id": 0}).sort("timestamp", -1))
        return docs
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM validations ORDER BY timestamp DESC"
        ).fetchall()
        conn.close()
        results = []
        for row in rows:
            d = dict(row)
            d["claims"] = json.loads(d.get("claims_json") or "[]")
            d["stats"]  = json.loads(d.get("stats_json")  or "{}")
            if d.get("relevance_json"):    d["relevance_eval"]    = json.loads(d["relevance_json"])
            if d.get("accuracy_json"):     d["accuracy_eval"]     = json.loads(d["accuracy_json"])
            if d.get("hallucination_json"):d["hallucination_eval"] = json.loads(d["hallucination_json"])
            if d.get("completeness_json"): d["completeness_eval"] = json.loads(d["completeness_json"])
            if d.get("verdict_json"):      d["verdict_eval"]      = json.loads(d["verdict_json"])
            results.append(d)
        return results


# ── Get single record ──────────────────────────────────────────────────────────

def get_validation(record_id: str) -> Optional[Dict]:
    if _use_mongo:
        doc = _mongo_db["validations"].find_one({"id": record_id}, {"_id": 0})
        return doc
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM validations WHERE id=?", (record_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["claims"] = json.loads(d.get("claims_json") or "[]")
        d["stats"]  = json.loads(d.get("stats_json")  or "{}")
        if d.get("relevance_json"):    d["relevance_eval"]    = json.loads(d["relevance_json"])
        if d.get("accuracy_json"):     d["accuracy_eval"]     = json.loads(d["accuracy_json"])
        if d.get("hallucination_json"):d["hallucination_eval"] = json.loads(d["hallucination_json"])
        if d.get("completeness_json"): d["completeness_eval"] = json.loads(d["completeness_json"])
        if d.get("verdict_json"):      d["verdict_eval"]      = json.loads(d["verdict_json"])
        return d


# ── Delete record ──────────────────────────────────────────────────────────────

def delete_validation(record_id: str) -> bool:
    if _use_mongo:
        result = _mongo_db["validations"].delete_one({"id": record_id})
        return result.deleted_count > 0
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        cur  = conn.execute("DELETE FROM validations WHERE id=?", (record_id,))
        conn.commit()
        conn.close()
        return cur.rowcount > 0


# ── Analytics aggregation ──────────────────────────────────────────────────────

def get_analytics_data() -> Dict:
    records = get_all_history()
    if not records:
        return {"records": [], "total": 0}
    return {"records": records, "total": len(records)}
