import argparse, os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

arg_parser = argparse.ArgumentParser()
arg_parser.add_argument("data")
args = arg_parser.parse_args()

f = Fernet(os.environ["ENCRYPTION_KEY"])

encrypted_data = f.encrypt(args.data.encode("utf-8")).decode("utf-8")
print(encrypted_data)
