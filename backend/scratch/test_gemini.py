import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

print(f"Testing API Key: {api_key[:10]}...")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-flash-latest')
    response = model.generate_content("Hello")
    print("Success! Response from Gemini:")
    print(response.text)
except Exception as e:
    print(f"Failed! Error: {e}")
