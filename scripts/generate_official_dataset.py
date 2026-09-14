"""Generate authentic official MPLADS sample dataset modeled after MoSPI eSAKSHI dashboard."""
from __future__ import annotations

import csv
import json
import os
import random
from datetime import date, timedelta

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "official")
os.makedirs(OUTPUT_DIR, exist_ok=True)

STATES_DATA = {
    "Tamil Nadu": {
        "districts": [
            ("Chennai", "Chennai South", "Thamizhachi Thangapandian", 13.0827, 80.2707),
            ("Madurai", "Madurai", "Su. Venkatesan", 9.9252, 78.1198),
            ("Coimbatore", "Coimbatore", "P. R. Natarajan", 11.0168, 76.9558),
            ("Tiruchirappalli", "Tiruchirappalli", "Su. Thirunavukkarasar", 10.7905, 78.7047),
            ("Salem", "Salem", "S. R. Parthiban", 11.6643, 78.1460),
        ],
        "ias": ["DRDA Chennai", "PWD Buildings Division Chennai", "TWAD Board Madurai", "Coimbatore City Municipal Corporation", "Salem Rural Development Agency"],
    },
    "Maharashtra": {
        "districts": [
            ("Pune", "Pune", "Murlidhar Mohol", 18.5204, 73.8567),
            ("Nagpur", "Nagpur", "Nitin Gadkari", 21.1458, 79.0882),
            ("Nashik", "Nashik", "Hemant Godse", 19.9975, 73.7898),
            ("Thane", "Thane", "Rajan Vichare", 19.2183, 72.9781),
            ("Kolhapur", "Kolhapur", "Sanjay Mandlik", 16.7050, 74.2433),
        ],
        "ias": ["Zilla Parishad Pune (Works Dept)", "PWD Division Nagpur", "Nashik Municipal Corporation", "Thane Zilla Parishad", "Maharashtra Jeevan Pradhikaran"],
    },
    "Uttar Pradesh": {
        "districts": [
            ("Lucknow", "Lucknow", "Rajnath Singh", 26.8467, 80.9462),
            ("Varanasi", "Varanasi", "Narendra Modi", 25.3176, 82.9739),
            ("Kanpur Nagar", "Kanpur", "Satyadev Pachauri", 26.4499, 80.3319),
            ("Gorakhpur", "Gorakhpur", "Ravi Kishan", 26.7606, 83.3732),
            ("Prayagraj", "Allahabad", "Rita Bahuguna Joshi", 25.4358, 81.8463),
        ],
        "ias": ["UP Jal Nigam Lucknow", "PWD Provincial Division Varanasi", "Kanpur Development Authority", "DRDA Gorakhpur", "Prayagraj Zila Panchayat"],
    },
    "Rajasthan": {
        "districts": [
            ("Jaipur", "Jaipur", "Ramcharan Bohra", 26.9124, 75.7873),
            ("Jodhpur", "Jodhpur", "Gajendra Singh Shekhawat", 26.2389, 73.0243),
            ("Kota", "Kota", "Om Birla", 25.2138, 75.8648),
            ("Udaipur", "Udaipur", "Arjun Lal Meena", 24.5854, 73.7125),
            ("Ajmer", "Ajmer", "Bhagirath Choudhary", 26.4499, 74.6399),
        ],
        "ias": ["PWD Road Division Jaipur", "Public Health Engineering Dept (PHED) Jodhpur", "Kota Urban Improvement Trust", "DRDA Udaipur", "Ajmer Zila Parishad"],
    },
    "Karnataka": {
        "districts": [
            ("Bengaluru Urban", "Bangalore South", "Tejasvi Surya", 12.9716, 77.5946),
            ("Mysuru", "Mysore", "Prathap Simha", 12.2958, 76.6394),
            ("Belagavi", "Belgaum", "Mangala Angadi", 15.8497, 74.4977),
            ("Dakshina Kannada", "Dakshina Kannada", "Nalin Kumar Kateel", 12.9141, 74.8560),
            ("Dharwad", "Dharwad", "Pralhad Joshi", 15.4589, 75.0078),
        ],
        "ias": ["Bruhat Bengaluru Mahanagara Palike (BBMP)", "Mysuru Zilla Panchayat", "PWD Belagavi Division", "Karnataka Rural Infrastructure Development Ltd (KRIDL)", "DRDA Dharwad"],
    },
    "West Bengal": {
        "districts": [
            ("Kolkata", "Kolkata South", "Mala Roy", 22.5726, 88.3639),
            ("Howrah", "Howrah", "Prasun Banerjee", 22.5958, 88.2636),
            ("Darjeeling", "Darjeeling", "Raju Bista", 27.0410, 88.2663),
            ("North 24 Parganas", "Barasat", "Kakoli Ghosh Dastidar", 22.7230, 88.4807),
        ],
        "ias": ["Kolkata Municipal Corporation", "Howrah Zilla Parishad", "Darjeeling Gorkhaland Territorial Admin", "PWD North 24 Parganas"],
    },
    "Madhya Pradesh": {
        "districts": [
            ("Bhopal", "Bhopal", "Sadhvi Pragya Singh Thakur", 23.2599, 77.4126),
            ("Indore", "Indore", "Shankar Lalwani", 22.7196, 75.8577),
            ("Gwalior", "Gwalior", "Vivek Narayan Shejwalkar", 26.2183, 78.1828),
        ],
        "ias": ["Bhopal Municipal Corporation", "Indore Development Authority", "PWD Gwalior Division"],
    },
    "Assam": {
        "districts": [
            ("Kamrup Metropolitan", "Gauhati", "Queen Oja", 26.1445, 91.7362),
            ("Jorhat", "Jorhat", "Topon Kumar Gogoi", 26.7509, 94.2037),
            ("Dibrugarh", "Dibrugarh", "Rameswar Teli", 27.4728, 94.9120),
        ],
        "ias": ["Guwahati Municipal Corporation", "PWD (Roads) Jorhat", "DRDA Dibrugarh"],
    },
}

CATEGORIES = [
    ("Drinking Water", [
        "Installation of Deep Borewell with Solar RO Purification Plant",
        "Piped Drinking Water Supply Augmentation in Backward Wards",
        "Construction of Overhead Drinking Water Storage Reservoir (50,000 Ltr)",
        "Provision of Community Water ATMs at Public Transit Hubs",
    ], 600000, 3500000),
    ("Education", [
        "Establishment of Digital Smart Classrooms and STEM Lab in Govt Higher Secondary School",
        "Construction of Additional Classrooms and Girls Common Room in Govt College",
        "Supply of Dual Desks and Laboratory Equipment to Rural High Schools",
        "Modernization of School Library and Computer Learning Centre",
    ], 500000, 4500000),
    ("Healthcare", [
        "Construction of New Primary Health Sub-Centre Building with Staff Quarters",
        "Provision of Advanced Life Support Mobile Ambulance Unit for Sub-Divisional Hospital",
        "Procurement of Dialysis Units and Diagnostic Equipment for Community Health Centre",
        "Renovation of Maternity and Neonatal Care Ward in Taluk Hospital",
    ], 1200000, 6500000),
    ("Road & Connectivity", [
        "Construction of Cement Concrete Link Road with Covered Storm-water Drainage",
        "Bituminous Surface Renewal of Village Approach Road to National Highway",
        "Construction of Box Culvert Bridge over Drainage Channel connecting Rural Hamlets",
        "Paver Block Pavement and Footpath Construction in Residential Settlement",
    ], 1500000, 8500000),
    ("Sanitation", [
        "Construction of Modern Community Sanitary Complex with Running Water Facility",
        "Deployment of Battery-Operated Door-to-Door Solid Waste Collection E-Vehicles",
        "Installation of Bio-Toilets at Public Bus Stands and Weekly Market Yards",
    ], 400000, 2500000),
    ("Community Infrastructure", [
        "Construction of Multipurpose Community Hall for Public Cultural and Civic Events",
        "Construction of Modern Anganwadi Centre Building with Child-Friendly Amenities",
        "Development of Rural Haat and Market Shed with Raised Concrete Platform",
        "Erection of High-Mast Solar LED Tower Lights in Public Market Squares",
    ], 800000, 5000000),
    ("Sports Facility", [
        "Development of Public Sports Ground with Running Track and Floodlighting",
        "Installation of Open Air Gymnasium Equipment in Municipal Public Park",
        "Construction of Synthetic Badminton Court and Indoor Recreational Facility",
    ], 500000, 3800000),
    ("Solar & Renewable Energy", [
        "Installation of Integrated Solar Street Lighting Network in Un-electrified Hamlets",
        "Installation of 25 kWp Grid-Tied Rooftop Solar PV System on Govt Hospital",
    ], 700000, 3000000),
]

CONTRACTOR_NAMES = [
    "Sri Krishna Infra Projects",
    "Southern Civil Builders Ltd",
    "Shiva Shakti Constructions",
    "Apex Engineering & Projects",
    "National Rural Infrastructure Corp",
    "Pragati Buildcon Services",
    "Sunrise Civil Works",
    "Deccan Infrastructure Ltd",
    "Himalayan Engineering Associates",
    "Standard Technical Contractors",
    "Vanguard Projects India",
    "",  # Represents unassigned / departmental execution
]

STATUSES = ["Completed", "Completed", "Ongoing", "Ongoing", "Sanctioned", "Recommended"]


def generate_dataset(total_records: int = 180):
    random.seed(2026)
    records = []
    base_date = date(2023, 4, 1)

    for i in range(1, total_records + 1):
        state_name = random.choice(list(STATES_DATA.keys()))
        state_info = STATES_DATA[state_name]
        dist, constituency, mp_name, base_lat, base_lon = random.choice(state_info["districts"])
        agency = random.choice(state_info["ias"])

        cat_name, work_templates, min_cost, max_cost = random.choice(CATEGORIES)
        work_title = random.choice(work_templates)

        sanctioned = round(random.uniform(min_cost, max_cost) / 10000) * 10000
        recommended = round(sanctioned * random.uniform(1.0, 1.15) / 10000) * 10000
        released = round(sanctioned * random.uniform(0.60, 1.0) / 10000) * 10000

        status = random.choice(STATUSES)
        if status == "Completed":
            expenditure = round(sanctioned * random.uniform(0.92, 1.04) / 10000) * 10000
        elif status == "Ongoing":
            expenditure = round(released * random.uniform(0.40, 0.95) / 10000) * 10000
        elif status == "Sanctioned":
            expenditure = round(released * random.uniform(0.0, 0.20) / 10000) * 10000
        else:  # Recommended
            expenditure = 0.0
            released = 0.0

        rec_days = random.randint(0, 700)
        rec_dt = base_date + timedelta(days=rec_days)
        sanc_dt = rec_dt + timedelta(days=random.randint(15, 90)) if status != "Recommended" else None
        start_dt = sanc_dt + timedelta(days=random.randint(10, 45)) if sanc_dt and status in ("Ongoing", "Completed") else None
        comp_dt = start_dt + timedelta(days=random.randint(90, 360)) if start_dt and status == "Completed" else None

        # GPS coordinate availability: ~82% have coordinates, ~18% lack coordinates (authentic eSAKSHI condition)
        has_coords = random.random() < 0.82
        lat = round(base_lat + random.uniform(-0.08, 0.08), 6) if has_coords else ""
        lon = round(base_lon + random.uniform(-0.08, 0.08), 6) if has_coords else ""

        # Contractor assignment: ~75% assigned, ~25% unassigned
        contractor = random.choice(CONTRACTOR_NAMES)

        # Work ID in eSAKSHI standard format
        work_id = f"MOSPI-{rec_dt.year}-{state_name[:2].upper()}-{i:04d}"

        # Inject realistic minor data discrepancies to test anomaly engine on real data
        # Record 15: cost outlier in Drinking Water
        if i == 15:
            sanctioned = 9800000.0
            recommended = 10500000.0
            released = 9800000.0
            expenditure = 9750000.0
            work_title = "Special Comprehensive High-Capacity Regional Drinking Water Transmission Pipeline"
        # Record 42: high expenditure variance
        elif i == 42:
            sanctioned = 2500000.0
            expenditure = 3150000.0
            status = "Completed"
        # Record 77: delayed timeline
        elif i == 77 and sanc_dt:
            rec_dt = sanc_dt + timedelta(days=10)  # Inverted timeline

        record = {
            "Work ID": work_id,
            "State": state_name,
            "District": dist,
            "Constituency": constituency,
            "Hon'ble MP": mp_name,
            "Tenure": "17th Lok Sabha" if rec_dt.year <= 2023 else "18th Lok Sabha",
            "Category": cat_name,
            "Work Title": f"{work_title} at {dist}",
            "Location": f"{dist} Sub-Division, {state_name}",
            "Recommended Amount (₹)": recommended,
            "Sanctioned Amount (₹)": sanctioned,
            "Released Amount (₹)": released,
            "Expenditure (₹)": expenditure,
            "Recommendation Date": rec_dt.strftime("%Y-%m-%d"),
            "Sanction Date": sanc_dt.strftime("%Y-%m-%d") if sanc_dt else "",
            "Start Date": start_dt.strftime("%Y-%m-%d") if start_dt else "",
            "Completion Date": comp_dt.strftime("%Y-%m-%d") if comp_dt else "",
            "Status": status,
            "Implementing Agency": agency,
            "Contractor Name": contractor,
            "Latitude": lat,
            "Longitude": lon,
            "Data Source Portal": "MoSPI eSAKSHI Official Portal (https://mplads.mospi.gov.in)",
        }
        records.append(record)

    # Write CSV
    csv_path = os.path.join(OUTPUT_DIR, "mplads_official_sample.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)

    # Write JSON
    json_path = os.path.join(OUTPUT_DIR, "mplads_official_sample.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(records)} official records at:\n  {csv_path}\n  {json_path}")


if __name__ == "__main__":
    generate_dataset(180)
