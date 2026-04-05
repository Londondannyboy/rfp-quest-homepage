"""
Team invitation tool: invite members to a company profile.
"""
import os
import json
import uuid
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import Dict, Any


def _get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)


@tool
def invite_team_member(email: str, company_id: str, invited_by_user_id: str, role: str = "member") -> str:
    """
    Invite a team member to join a company profile.
    Creates a team_invitations record with a unique token.
    The invited person receives the join link.

    Args:
        email: Email address of the person to invite
        company_id: UUID of the company profile
        invited_by_user_id: UUID of the person_profiles row sending the invite
        role: Role to assign (admin or member)

    Returns:
        Join URL or error message.
    """
    conn = _get_db_connection()
    if not conn:
        return "Error: database connection failed"

    try:
        token = str(uuid.uuid4())
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO team_invitations (company_id, invited_by, email, role, token)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (company_id, invited_by_user_id, email, role, token),
        )
        conn.commit()
        cur.close()
        conn.close()

        join_url = f"https://rfp-quest-homepage.vercel.app/join/{token}"
        return f"Invitation sent to {email}. Join link: {join_url}"
    except Exception as e:
        if conn:
            conn.close()
        return f"Error creating invitation: {str(e)}"
