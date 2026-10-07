import urllib.request
import json

def test():
    req = urllib.request.Request(
        "http://127.0.0.1:27182/run",
        data=json.dumps({"type": "cmd", "command": "echo Context Commander Bridge OK"}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Response:", resp.read().decode('utf-8'))

if __name__ == "__main__":
    test()
