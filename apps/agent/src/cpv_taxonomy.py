"""
CPV code → Vertical → Niche mapping.
Based on the EU Common Procurement Vocabulary standard.
CPV has 4 levels: Division (2-digit) → Group (3-digit) → Class (4-digit) → Category (5-digit).
We map Division → Vertical and Group → Niche.
"""

# Division (2-digit) → Vertical mapping
CPV_DIVISION_TO_VERTICAL = {
    # Construction
    "45": "Construction & Civil Engineering",

    # Business Services
    "79": "Business & Professional Services",

    # Health & Social
    "85": "Health & Social Care Services",
    "33": "Medical Equipment & Supplies",

    # Engineering & Architecture
    "71": "Architecture, Engineering & Planning",

    # IT & Software
    "72": "IT Services & Consulting",
    "48": "Software & Licensing",
    "30": "IT Hardware & Equipment",
    "32": "Telecoms Equipment & Services",

    # Education
    "80": "Education & Training",

    # Transport
    "60": "Transport Services",
    "34": "Vehicles & Transport Equipment",
    "63": "Transport Support Services",

    # Repair & Maintenance
    "50": "Repair & Maintenance Services",

    # Environment
    "90": "Environmental & Waste Services",
    "77": "Agricultural & Forestry Services",

    # Research
    "73": "Research & Development",

    # Industrial
    "44": "Construction Materials & Structures",
    "43": "Mining & Construction Machinery",
    "42": "Industrial Machinery",
    "31": "Electrical Equipment",

    # Finance & Insurance
    "66": "Financial & Insurance Services",

    # Laboratory & Precision
    "38": "Laboratory & Precision Equipment",

    # Furniture & Supplies
    "39": "Furniture & Office Equipment",

    # Food & Catering
    "55": "Hotel, Restaurant & Catering",
    "15": "Food & Beverages",

    # Security
    "75": "Public Administration & Defence",
    "35": "Security & Defence Equipment",

    # Energy
    "09": "Petroleum & Energy Products",
    "65": "Utilities & Energy Services",
    "51": "Installation Services",

    # Textiles & Clothing
    "18": "Clothing & Textiles",
    "19": "Leather & Textile Materials",

    # Publishing & Printing
    "22": "Printed Matter & Publishing",
    "64": "Postal & Courier Services",

    # Chemicals
    "24": "Chemical Products",
    "25": "Rubber & Plastics",

    # Recreation
    "92": "Recreation & Culture Services",
    "37": "Musical & Sports Equipment",

    # Sewage & Water
    "41": "Water Services",
    "76": "Oil & Gas Services",

    # Other
    "98": "Other Community Services",
}

# Group (3-digit) → Niche mapping (selected high-volume groups)
CPV_GROUP_TO_NICHE = {
    # Construction niches
    "451": "Site Preparation",
    "452": "Building Construction",
    "453": "Building Installation",
    "454": "Building Completion",
    "455": "Plant & Equipment Hire",

    # IT niches
    "721": "IT Hardware Consulting",
    "722": "Software Development & Programming",
    "723": "IT Support & Helpdesk",
    "724": "Internet & Intranet Services",

    # Software niches
    "481": "Business Software",
    "482": "Internet & Intranet Software",
    "483": "Communication Software",
    "487": "IT Security Software",

    # Health niches
    "851": "Health Services",
    "853": "Social Work & Community Services",

    # Medical equipment niches
    "331": "Medical Devices & Instruments",
    "332": "Laboratory & Research Equipment",
    "336": "Pharmaceutical Products",

    # Business services niches
    "791": "Legal Services",
    "792": "Management Consulting",
    "793": "Market Research & Statistics",
    "794": "Recruitment & HR Services",
    "795": "Security Services",
    "796": "Publishing & Printing Services",
    "797": "Investigation & Security",
    "798": "Translation & Interpretation",

    # Engineering niches
    "711": "Architectural Services",
    "712": "Engineering Design",
    "713": "Environmental Engineering",

    # Education niches
    "801": "Pre-school Education",
    "802": "Secondary Education",
    "803": "Higher Education",
    "804": "Adult & Vocational Training",
    "805": "Training Services",

    # Transport niches
    "601": "Rail Transport",
    "602": "Bus & Coach Transport",
    "603": "Air Transport",
    "604": "Freight Transport",

    # Environment niches
    "901": "Refuse & Waste Services",
    "902": "Sewage & Waste Treatment",
    "903": "Anti-pollution Services",
    "904": "Environmental Management",

    # Research niches
    "731": "R&D in Natural Sciences",
    "732": "R&D in Social Sciences",

    # Finance niches
    "661": "Banking Services",
    "662": "Insurance Services",
    "663": "Fund Management",

    # Telecoms niches
    "322": "Telecoms Equipment",
    "325": "Radio & TV Equipment",

    # Security niches
    "351": "Surveillance & Security Equipment",
    "352": "Fire Fighting Equipment",
    "353": "Military Equipment",

    # Energy niches
    "651": "Electricity Services",
    "652": "Gas Services",
    "653": "Water Distribution",
}


def cpv_to_vertical(cpv_code: str) -> str | None:
    """Map a CPV code to its vertical (from 2-digit division)."""
    if not cpv_code or len(cpv_code) < 2:
        return None
    division = cpv_code[:2]
    return CPV_DIVISION_TO_VERTICAL.get(division)


def cpv_to_niche(cpv_code: str) -> str | None:
    """Map a CPV code to its niche (from 3-digit group)."""
    if not cpv_code or len(cpv_code) < 3:
        return None
    group = cpv_code[:3]
    return CPV_GROUP_TO_NICHE.get(group)
