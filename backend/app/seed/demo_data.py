from __future__ import annotations

import random
from datetime import date, timedelta

import bcrypt
from sqlalchemy.orm import Session

from ..models import Contractor, Payment, Project, User, Investigation
from ..ml.anomaly_engine import run_anomaly_analysis

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

LOCATIONS = {
    "Tamil Nadu": [("Chennai", 13.0827, 80.2707), ("Madurai", 9.9252, 78.1198), ("Coimbatore", 11.0168, 76.9558)],
    "Maharashtra": [("Pune", 18.5204, 73.8567), ("Nashik", 19.9975, 73.7898), ("Nagpur", 21.1458, 79.0882)],
    "Uttar Pradesh": [("Lucknow", 26.8467, 80.9462), ("Varanasi", 25.3176, 82.9739), ("Kanpur", 26.4499, 80.3319)],
    "Rajasthan": [("Jaipur", 26.9124, 75.7873), ("Kota", 25.2138, 75.8648), ("Jodhpur", 26.2389, 73.0243)],
    "Karnataka": [("Bengaluru Urban", 12.9716, 77.5946), ("Mysuru", 12.2958, 76.6394), ("Belagavi", 15.8497, 74.4977)],
    "West Bengal": [("Kolkata", 22.5726, 88.3639), ("Howrah", 22.5958, 88.2636), ("Darjeeling", 27.0410, 88.2663)],
    "Madhya Pradesh": [("Bhopal", 23.2599, 77.4126), ("Indore", 22.7196, 75.8577), ("Gwalior", 26.2183, 78.1828)],
    "Assam": [("Kamrup Metropolitan", 26.1445, 91.7362), ("Jorhat", 26.7509, 94.2037), ("Dibrugarh", 27.4728, 94.9120)],
}
PROJECT_TYPES = ["Road & Connectivity", "Drinking Water", "Healthcare", "Education", "Sanitation", "Community Infrastructure", "Sports Facility", "Solar Lighting"]
AGENCIES = ["District Rural Development Agency", "Public Works Department", "Municipal Engineering Division", "Rural Water Supply Department", "Zila Parishad"]
FIRST = ["Aarav", "Meera", "Vikram", "Kavya", "Rohan", "Ananya", "Sanjay", "Divya", "Arjun", "Nisha", "Prakash", "Isha"]
LAST = ["Infrastructure", "Projects", "Engineering", "Buildcon", "Works", "Enterprises", "Developers", "Constructors"]


def _rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


def seed_demo_data(db: Session, count: int = 1200, force: bool = False) -> dict:
    if db.query(Project).first() and not force:
        return {"seeded": False, "message": "Database already contains demo data."}
    if force:
        # Used only in scripts against an empty/recreated development database.
        from ..database import Base, engine
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    random.seed(42)
    user = User(email="officer@mplad.demo", full_name="Aditi Sharma", role="MPLAD Monitoring Officer", password_hash=hash_password("Demo@123"))
    db.add(user)
    contractors: list[Contractor] = []
    all_districts = [(state, *place) for state, values in LOCATIONS.items() for place in values]
    for i in range(72):
        state, district, _, _ = random.choice(all_districts)
        contractor = Contractor(contractor_id=f"CTR-{i + 1:03d}", name=f"{random.choice(FIRST)} {random.choice(LAST)} {i + 1:02d}", registration_info=f"REG/{state[:3].upper()}/{2020 + i % 5}/{1000 + i}", district=district)
        contractors.append(contractor)
        db.add(contractor)
    db.flush()

    start_range, end_range = date(2022, 4, 1), date(2026, 2, 28)
    concentration_contractor = contractors[0]
    for i in range(1, count + 1):
        state, district, base_lat, base_lon = random.choice(all_districts)
        project_type = random.choice(PROJECT_TYPES)
        sanctioned = round(random.lognormvariate(14.25, 0.45) / 1000) * 1000
        sanctioned = min(max(sanctioned, 650000), 8500000)
        contractor = concentration_contractor if district == concentration_contractor.district and i % 3 == 0 else random.choice(contractors)
        recommendation = _rand_date(start_range, end_range)
        sanction = recommendation + timedelta(days=random.randint(12, 90))
        start = sanction + timedelta(days=random.randint(8, 50))
        duration = random.randint(80, 390)
        completion = start + timedelta(days=duration)
        status = "Completed" if completion < date.today() else random.choice(["Ongoing", "Sanctioned"])
        released = sanctioned * random.uniform(0.7, 1.0)
        expenditure = released * random.uniform(0.68, 1.02)
        p = Project(project_id=f"MPLAD-{i:05d}", mp_id=f"MP-{random.randint(1, 110):03d}", constituency_id=f"{state[:3].upper()}-{random.randint(1, 45):02d}", state=state, district=district, project_type=project_type, location=f"Ward {random.randint(1, 48)}, {district}", description=f"{project_type} improvement work at Ward {random.randint(1, 48)} in {district}", recommended_amount=sanctioned * random.uniform(0.92, 1.0), sanctioned_amount=sanctioned, released_amount=round(released, 2), expenditure=round(expenditure, 2), recommendation_date=recommendation, sanction_date=sanction, start_date=start, completion_date=completion, status=status, implementing_agency=random.choice(AGENCIES), contractor_id=contractor.contractor_id, latitude=base_lat + random.uniform(-0.08, 0.08), longitude=base_lon + random.uniform(-0.08, 0.08))
        db.add(p)
        paid = 0.0
        installments = random.randint(2, 5)
        for j in range(installments):
            amount = (released - paid) if j == installments - 1 else released * random.uniform(0.12, 0.34)
            paid += amount
            db.add(Payment(project_id=p.project_id, payment_date=sanction + timedelta(days=random.randint(20, max(30, duration))), amount=round(amount, 2), recipient=contractor.name, payment_type=random.choice(["Mobilisation", "Work progress", "Final release"])))
    db.flush()

    # Repeatable, multi-signal showcase for the live demonstration.
    demo_contractor = concentration_contractor
    demo_sanction = date(2024, 5, 14)
    demo = Project(project_id="MPLAD-DEMO-00421", mp_id="MP-042", constituency_id="TAM-18", state="Tamil Nadu", district="Madurai", project_type="Drinking Water", location="Ward 17, Melur Road, Madurai", description="Augmentation of community drinking water distribution and storage facility near Melur Road", recommended_amount=4700000, sanctioned_amount=4800000, released_amount=4720000, expenditure=4950000, recommendation_date=date(2024, 4, 10), sanction_date=demo_sanction, start_date=date(2024, 5, 18), completion_date=date(2024, 6, 4), status="Completed", implementing_agency="Rural Water Supply Department", contractor_id=demo_contractor.contractor_id, latitude=9.9468, longitude=78.1457)
    duplicate = Project(project_id="MPLAD-DEMO-00422", mp_id="MP-043", constituency_id="TAM-18", state="Tamil Nadu", district="Madurai", project_type="Drinking Water", location="Ward 18, Melur Road, Madurai", description="Community drinking water distribution enhancement near Melur Road", recommended_amount=3750000, sanctioned_amount=3900000, released_amount=3500000, expenditure=3280000, recommendation_date=date(2024, 2, 10), sanction_date=date(2024, 3, 9), start_date=date(2024, 4, 2), completion_date=date(2025, 1, 15), status="Completed", implementing_agency="Rural Water Supply Department", contractor_id=demo_contractor.contractor_id, latitude=9.9495, longitude=78.1492)
    db.add_all([demo, duplicate])
    db.flush()
    db.add_all([
        Payment(project_id=demo.project_id, payment_date=date(2024, 5, 5), amount=500000, recipient=demo_contractor.name, payment_type="Mobilisation"),
        Payment(project_id=demo.project_id, payment_date=date(2024, 5, 22), amount=3400000, recipient=demo_contractor.name, payment_type="Work progress"),
        Payment(project_id=demo.project_id, payment_date=date(2024, 6, 3), amount=820000, recipient=demo_contractor.name, payment_type="Final release"),
        Investigation(project_id=demo.project_id, officer="Aditi Sharma", status="Under Review", remarks="Field inspection scheduled to cross-check water pipe network augmentation and payment milestone dates against sanction letter."),
        Investigation(project_id=duplicate.project_id, officer="Aditi Sharma", status="Open", remarks="Proximity alert flagged against MPLAD-DEMO-00421. Comparing technical project drawings and DPR files."),
        Investigation(project_id="MPLAD-00001", officer="Rajesh Kumar", status="Verification Requested", remarks="Contractor allocation and expenditure ratio audit requested from district division."),
    ])
    db.commit()
    result = run_anomaly_analysis(db)
    return {"seeded": True, "projects": count + 2, **result}
