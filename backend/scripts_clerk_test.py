"""Dev helper: create/find Clerk test users and mint short-lived session tokens (preview instance only).
Usage: python scripts_clerk_test.py  -> prints JSON {email: {user_id, token, ticket}}"""
import json, os, sys, urllib.request, urllib.error
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SK = os.environ["CLERK_SECRET_KEY"]
H = {"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"}

def call(method, path, body=None):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers=H)
    return json.load(urllib.request.urlopen(req))

def ensure(email, first):
    found = call("GET", f"/users?email_address={urllib.parse.quote(email)}")
    if found: return found[0]
    return call("POST", "/users", {"email_address": [email], "password": "Souqna-Test-2026!", "first_name": first, "skip_password_checks": True})

import urllib.parse
out = {}
for email, first in [("admin+clerk_test@souqna.dev", "Admin"), ("buyer+clerk_test@souqna.dev", "Buyer"), ("seller+clerk_test@souqna.dev", "Seller")]:
    u = ensure(email, first)
    s = call("POST", "/sessions", {"user_id": u["id"]})
    tok = call("POST", f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 3600})["jwt"]
    ticket = call("POST", "/sign_in_tokens", {"user_id": u["id"], "expires_in_seconds": 3600})["token"]
    out[email] = {"user_id": u["id"], "token": tok, "ticket": ticket}
json.dump(out, open("/tmp/clerk_tokens.json", "w"))
print({k: v["user_id"] for k, v in out.items()})
