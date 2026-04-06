"""
Zep graph integration — sync person profiles to knowledge graph.
Creates entities and relationships for skills, certifications,
career wins/losses, and CPV categories.
"""
import os
import json
import psycopg2
import psycopg2.extras
from zep_cloud import Zep
from langchain.tools import tool
from typing import Dict, Any, List


GRAPH_ID = os.getenv("ZEP_GRAPH", "rfp-quest-skills")


def _get_zep_client() -> Zep | None:
    api_key = os.getenv("ZEP_API_KEY")
    if not api_key:
        return None
    return Zep(api_key=api_key)


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


def _ensure_graph(client: Zep) -> None:
    """Create the skills graph if it doesn't exist."""
    try:
        client.graph.get(graph_id=GRAPH_ID)
    except Exception:
        client.graph.create(
            graph_id=GRAPH_ID,
            name="RFP.quest Skills Graph",
            description="Skills, certifications, career wins/losses, and CPV categories for UK procurement professionals",
        )


@tool
def sync_person_to_zep(user_id: str) -> str:
    """
    Sync a person's profile data from Neon to the Zep knowledge graph.
    Creates entity nodes for the person, their skills, certifications,
    and sector expertise. Links them with typed relationships.

    Call this after save_company_profile completes to build
    the person's initial skills graph.

    Args:
        user_id: The person's Neon Auth user ID.

    Returns:
        Summary of what was synced, or error message.
    """
    zep = _get_zep_client()
    if not zep:
        return "Error: ZEP_API_KEY not set"

    conn = _get_db_connection()
    if not conn:
        return "Error: database connection failed"

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get person + company data
        cur.execute(
            """
            SELECT pp.display_name, pp.job_title, pp.email,
                   pp.layer1_capabilities, pp.layer2_expertise,
                   pp.specialisms,
                   cp.name as company_name, cp.domain,
                   cp.sectors, cp.certifications, cp.frameworks,
                   cp.cpv_codes, cp.sic_codes, cp.region,
                   cp.is_sme, cp.description as company_description
            FROM person_profiles pp
            LEFT JOIN company_profiles cp ON pp.company_id = cp.id
            WHERE pp.user_id = %s
            """,
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return f"Error: no person_profiles row for user_id {user_id}"

        _ensure_graph(zep)

        facts_added = 0

        # Person node
        person_name = row["display_name"] or "Unknown"
        company_name = row["company_name"] or "Independent"

        # Person → works at → Company
        if row["company_name"]:
            zep.graph.add_fact_triple(
                graph_id=GRAPH_ID,
                source_node_name=person_name,
                source_node_labels=["Person"],
                target_node_name=company_name,
                target_node_labels=["Company"],
                fact=f"{person_name} works at {company_name}",
                fact_name="WORKS_AT",
            )
            facts_added += 1

        # Person → has → Skill (DOS capabilities)
        capabilities = row.get("layer1_capabilities") or []
        if isinstance(capabilities, str):
            try:
                capabilities = json.loads(capabilities)
            except Exception:
                capabilities = []
        for cap in capabilities:
            if isinstance(cap, str) and cap.strip():
                zep.graph.add_fact_triple(
                    graph_id=GRAPH_ID,
                    source_node_name=person_name,
                    source_node_labels=["Person"],
                    target_node_name=cap.strip(),
                    target_node_labels=["Skill", "DOS_Capability"],
                    fact=f"{person_name} has capability in {cap}",
                    fact_name="HAS_CAPABILITY",
                )
                facts_added += 1

        # Person → holds → Certification
        certs = row.get("certifications") or []
        if isinstance(certs, str):
            try:
                certs = json.loads(certs)
            except Exception:
                certs = []
        for cert in certs:
            cert_name = cert if isinstance(cert, str) else cert.get("name", "")
            if cert_name.strip():
                zep.graph.add_fact_triple(
                    graph_id=GRAPH_ID,
                    source_node_name=person_name,
                    source_node_labels=["Person"],
                    target_node_name=cert_name.strip(),
                    target_node_labels=["Certification"],
                    fact=f"{person_name} holds {cert_name} certification",
                    fact_name="HOLDS_CERTIFICATION",
                )
                facts_added += 1

        # Person → works in → Sector
        sectors = row.get("sectors") or []
        if isinstance(sectors, str):
            try:
                sectors = json.loads(sectors)
            except Exception:
                sectors = []
        for sector in sectors:
            if isinstance(sector, str) and sector.strip():
                zep.graph.add_fact_triple(
                    graph_id=GRAPH_ID,
                    source_node_name=person_name,
                    source_node_labels=["Person"],
                    target_node_name=sector.strip(),
                    target_node_labels=["Sector"],
                    fact=f"{person_name} works in the {sector} sector",
                    fact_name="WORKS_IN_SECTOR",
                )
                facts_added += 1

        # Person → on framework → Framework
        frameworks = row.get("frameworks") or []
        if isinstance(frameworks, str):
            try:
                frameworks = json.loads(frameworks)
            except Exception:
                frameworks = []
        for fw in frameworks:
            fw_name = fw if isinstance(fw, str) else fw.get("name", "")
            if fw_name.strip():
                zep.graph.add_fact_triple(
                    graph_id=GRAPH_ID,
                    source_node_name=person_name,
                    source_node_labels=["Person"],
                    target_node_name=fw_name.strip(),
                    target_node_labels=["Framework"],
                    fact=f"{person_name} is on the {fw_name} framework",
                    fact_name="ON_FRAMEWORK",
                )
                facts_added += 1

        # Company → based in → Region
        if row.get("region"):
            zep.graph.add_fact_triple(
                graph_id=GRAPH_ID,
                source_node_name=company_name,
                source_node_labels=["Company"],
                target_node_name=row["region"],
                target_node_labels=["Region"],
                fact=f"{company_name} is based in {row['region']}",
                fact_name="BASED_IN",
            )
            facts_added += 1

        # Add Layer 2 expertise as free text (Zep auto-extracts entities)
        if row.get("layer2_expertise"):
            zep.graph.add(
                graph_id=GRAPH_ID,
                data=f"Person: {person_name}. Expertise: {row['layer2_expertise']}",
                type="text",
            )
            facts_added += 1

        return f"Synced {person_name} to Zep graph. {facts_added} facts added."

    except Exception as e:
        if conn:
            conn.close()
        return f"Error syncing to Zep: {str(e)}"


@tool
def add_bid_outcome(
    user_id: str,
    contract_name: str,
    buyer: str,
    value: str,
    year: str,
    outcome: str,
    role: str,
    contribution: str,
) -> str:
    """
    Add a bid outcome (win or loss) to the person's career graph.
    Creates nodes and edges in Zep representing the contract,
    buyer, and the person's role in the bid.

    Args:
        user_id: The person's Neon Auth user ID.
        contract_name: Name of the contract/tender.
        buyer: The buying organisation.
        value: Approximate contract value (e.g. "£500K").
        year: Year of the bid (e.g. "2023").
        outcome: "win" or "loss".
        role: Person's role (e.g. "Bid Manager", "Technical Author").
        contribution: Brief description of what they did.

    Returns:
        Confirmation message.
    """
    zep = _get_zep_client()
    if not zep:
        return "Error: ZEP_API_KEY not set"

    # Get person name from Neon
    conn = _get_db_connection()
    if not conn:
        return "Error: database connection failed"

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT display_name FROM person_profiles WHERE user_id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        person_name = row["display_name"] if row else "Unknown"
    except Exception:
        if conn:
            conn.close()
        person_name = "Unknown"

    _ensure_graph(zep)

    outcome_label = "Win" if outcome.lower() == "win" else "Loss"
    fact_name = "WON_CONTRACT" if outcome.lower() == "win" else "LOST_BID"

    # Person → won/lost → Contract
    zep.graph.add_fact_triple(
        graph_id=GRAPH_ID,
        source_node_name=person_name,
        source_node_labels=["Person"],
        target_node_name=contract_name,
        target_node_labels=["Contract", outcome_label],
        source_node_attributes={"role": role},
        target_node_attributes={
            "buyer": buyer,
            "value": value,
            "year": year,
            "outcome": outcome.lower(),
        },
        fact=f"{person_name} {outcome.lower()} the {contract_name} contract ({value}) for {buyer} in {year} as {role}. {contribution}",
        fact_name=fact_name,
    )

    # Contract → awarded by → Buyer
    zep.graph.add_fact_triple(
        graph_id=GRAPH_ID,
        source_node_name=contract_name,
        source_node_labels=["Contract", outcome_label],
        target_node_name=buyer,
        target_node_labels=["Buyer"],
        fact=f"{contract_name} was procured by {buyer}",
        fact_name="PROCURED_BY",
    )

    return f"Added {outcome_label.lower()}: {contract_name} ({value}, {buyer}, {year}) as {role}."


def get_person_subgraph(user_id: str) -> Dict[str, Any]:
    """
    Get a person's subgraph from Zep as nodes and links for 3D visualization.
    
    Args:
        user_id: The person's Neon Auth user ID.
        
    Returns:
        Dict with nodes, links, and user info for React Force Graph 3D.
    """
    zep = _get_zep_client()
    if not zep:
        return {"error": "ZEP_API_KEY not set"}

    conn = _get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}

    try:
        # Get person details from Neon
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT pp.display_name, pp.email, pp.company_id,
                   cp.name as company_name
            FROM person_profiles pp
            LEFT JOIN company_profiles cp ON pp.company_id = cp.id
            WHERE pp.user_id = %s
            """,
            (user_id,)
        )
        user_row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user_row:
            return {"error": f"No person_profiles row for user_id {user_id}"}
            
        person_name = user_row["display_name"] or "Unknown"
        
        # Search Zep for this person's subgraph
        result = zep.graph.search(graph_id=GRAPH_ID, query=person_name, limit=50)
        
        # Parse edges into nodes and links
        nodes = {}
        links = []
        
        # Define node colors by type
        colors = {
            "person": "#4A90E2",
            "company": "#50E3C2", 
            "sector": "#9013FE",
            "win": "#7ED321",
            "loss": "#EF4444",
            "buyer": "#4A90E2",
            "contract": "#7ED321",  # Default to win color
            "skill": "#9013FE",
            "certification": "#F5A623",
            "framework": "#BD10E0"
        }
        
        for edge in result.edges:
            source_uuid = edge.source_node_uuid
            target_uuid = edge.target_node_uuid
            fact = edge.fact
            edge_type = edge.attributes.get('edge_type', edge.name)
            
            # Extract node names from the fact text
            # Parse patterns like "Dan Keegan works at GTM Quest"
            parts = fact.split()
            
            # Determine node types and names from the fact
            source_name = person_name  # Usually the person
            target_name = "Unknown"
            source_type = "person"
            target_type = "unknown"
            
            if "works at" in fact:
                target_name = fact.split("works at")[-1].strip()
                target_type = "company"
            elif "works in" in fact and "sector" in fact:
                target_name = fact.split("works in the")[-1].split("sector")[0].strip()
                target_type = "sector"
            elif "win" in fact.lower() or "won" in fact.lower():
                # Extract contract name - look for contract names in quotes or after specific patterns
                contract_parts = fact.split()
                if "contract" in fact:
                    # Try to extract contract name before "contract"
                    contract_idx = None
                    for i, part in enumerate(contract_parts):
                        if "contract" in part.lower():
                            contract_idx = i
                            break
                    if contract_idx and contract_idx > 2:
                        target_name = " ".join(contract_parts[2:contract_idx]).strip("the ")
                    else:
                        target_name = "Contract"
                target_type = "win"
            elif "loss" in fact.lower() or "lost" in fact.lower():
                target_name = fact.split(" for ")[0].split()[-1] if " for " in fact else "Bid"
                target_type = "loss"
            elif "procured by" in fact or "awarded by" in fact:
                source_name = fact.split(" was ")[0] if " was " in fact else "Contract"
                source_type = "contract"
                target_name = fact.split("by ")[-1].strip()
                target_type = "buyer"
            
            # Add nodes if not already present
            if source_uuid not in nodes:
                nodes[source_uuid] = {
                    "id": source_uuid,
                    "name": source_name,
                    "type": source_type,
                    "color": colors.get(source_type, "#888888"),
                    "val": 20 if source_type == "person" else 15
                }
                
            if target_uuid not in nodes:
                nodes[target_uuid] = {
                    "id": target_uuid,
                    "name": target_name, 
                    "type": target_type,
                    "color": colors.get(target_type, "#888888"),
                    "val": 15 if target_type == "company" else 10
                }
            
            # Add link
            link_data = {
                "source": source_uuid,
                "target": target_uuid,
                "type": edge_type,
                "label": fact
            }
            
            # Extract value for contracts
            if "£" in fact:
                import re
                value_match = re.search(r'£(\d+(?:,\d+)*(?:\.\d+)?)', fact)
                if value_match:
                    value_str = value_match.group(1).replace(',', '')
                    try:
                        if 'K' in fact.upper():
                            link_data["value"] = float(value_str) * 1000
                        else:
                            link_data["value"] = float(value_str)
                    except:
                        pass
                        
            links.append(link_data)
        
        return {
            "nodes": list(nodes.values()),
            "links": links,
            "user": {
                "name": person_name,
                "email": user_row["email"],
                "company_id": user_row["company_id"]
            }
        }
        
    except Exception as e:
        if conn:
            conn.close()
        return {"error": f"Error querying Zep: {str(e)}"}
