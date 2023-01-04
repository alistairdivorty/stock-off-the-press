import json

with open(".env.production", "r") as f:
    content = f.readlines()

json_ = json.dumps(dict([l.strip().split("=", 1) for l in content]), indent=4)

with open("env.json", "w") as f:
    f.write(json_)
