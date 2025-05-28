import os
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv('POSTGRES_USER')
***REMOVED*** = os.getenv('***REMOVED***')
POSTGRES_DB = os.getenv('POSTGRES_DB')
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')

***REMOVED*** = f'postgresql+asyncpg://{POSTGRES_USER}:{***REMOVED***}@{POSTGRES_HOST}:5432/{POSTGRES_DB}'