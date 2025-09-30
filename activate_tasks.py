#!/usr/bin/env python3
"""
Script to activate all inactive tasks in the database
"""
import sys
import os
sys.path.append('/Users/godsonajodo/Desktop/Prometheus/efference-website/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Task
from app.config import settings

def activate_tasks():
    """Activate all inactive tasks"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Get all inactive tasks
        inactive_tasks = db.query(Task).filter(Task.is_active == False).all()
        print(f"🔍 Found {len(inactive_tasks)} inactive tasks")
        
        if inactive_tasks:
            for task in inactive_tasks:
                print(f"📋 Activating task: {task.title} (ID: {task.task_id})")
                task.is_active = True
            
            db.commit()
            print(f"✅ Successfully activated {len(inactive_tasks)} tasks")
        else:
            print("ℹ️ No inactive tasks found")
            
        # Verify the results
        all_tasks = db.query(Task).all()
        active_tasks = db.query(Task).filter(Task.is_active == True).all()
        print(f"📊 Total tasks: {len(all_tasks)}")
        print(f"📊 Active tasks: {len(active_tasks)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Activating inactive tasks...")
    activate_tasks()