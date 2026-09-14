"""Create tables and seed the synthetic MPLAD prototype dataset."""
from backend.app.database import Base, SessionLocal, engine
from backend.app.seed.demo_data import seed_demo_data

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        print(seed_demo_data(session))
