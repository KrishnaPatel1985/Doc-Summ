import requests, time
BASE = "http://127.0.0.1:8000"

print("Starting backend smoke test...")

r = requests.get(f"{BASE}/health")
assert r.status_code == 200; print("Health OK")

r = requests.post(f"{BASE}/api/summarize", data={
    "text": "Artificial intelligence is transforming industries. " * 30,
    "sentences": "5", "method": "lexrank"})
assert r.status_code == 202
job_id = r.json()["job_id"]; print(f"Job created: {job_id}")

# Wait for background job to finish processing
time.sleep(6)

r = requests.get(f"{BASE}/api/summary/{job_id}")
assert r.status_code == 200
data = r.json()
assert data["summary"]; print(f"Summary OK ({data['char_count_summary']} chars)")

r = requests.get(f"{BASE}/api/history")
assert r.status_code == 200 and len(r.json()) >= 1; print(f"History OK ({len(r.json())} items)")

print("\nAll backend smoke tests passed!")
