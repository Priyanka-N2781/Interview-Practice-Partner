import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
API_KEY = os.environ.get("GEMINI_API_KEY")
print("Key length:", len(API_KEY) if API_KEY else 0)

try:
    genai.configure(api_key=API_KEY)
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    import traceback
    traceback.print_exc()
