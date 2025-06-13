# Create sample paper with ID 1 to resolve foreign key constraint issues
docker-compose exec backend python -c "
import sys
from src.database import SessionLocal
from src.models import Paper
import datetime

db = SessionLocal()
try:
    # Check if paper with ID 1 exists
    paper = db.query(Paper).filter(Paper.paper_id == 1).first()
    
    if not paper:
        print('Creating sample paper with ID 1...')
        # Create a sample paper
        sample_paper = Paper(
            paper_id=1,
            title='Sample Test Paper',
            description='This is a sample paper for testing question uploads',
            time_limit_minutes=60,
            passing_percentage=60,
            is_active=True,
            created_by_user_id=1,
            created_at=datetime.datetime.now(),
            updated_at=datetime.datetime.now()
        )
        db.add(sample_paper)
        db.commit()
        print('Sample paper created successfully!')
    else:
        print('Paper with ID 1 already exists.')
        
except Exception as e:
    db.rollback()
    print(f'Error creating sample paper: {e}')
finally:
    db.close()
"
