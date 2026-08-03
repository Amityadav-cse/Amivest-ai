import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "finsaathi"),
            connection_timeout=5,
        )

        if conn.is_connected():
            print("✅ MySQL Connected")
            return conn

        print("❌ MySQL connection failed")
        return None

    except Error as e:
        print(f"❌ Database Error: {e}")
        return None

    except Exception as e:
        print(f"❌ Unexpected Database Error: {e}")
        return None