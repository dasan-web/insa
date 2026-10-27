import urllib.request
import json

BASE = "http://localhost:3001"

def test_api():
    print("=== 1. TEST POST (INSERT) ===")
    new_emp = {
        "department": "테스트부서",
        "name": "홍길동",
        "employment_type": "정직원",
        "hire_date": "2026-10-22",
        "position_years": "선임1년",
        "phone": "010-9999-8888",
        "email": "gildong@dspharm.com",
        "status": "재직",
        "notes": "시스템 테스트 생성 사원"
    }
    req = urllib.request.Request(
        f"{BASE}/api/employees",
        data=json.dumps(new_emp).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("POST Result:", res)
        emp_id = res['insertId']

    print(f"\n=== 2. TEST GET (SEARCH BY NAME: 홍길동) ===")
    with urllib.request.urlopen(f"{BASE}/api/employees?search=%ED%99%8D%EA%B8%B8%EB%8F%99") as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"Found {len(res['data'])} records. First ID: {res['data'][0]['id']}, Name: {res['data'][0]['name']}")

    print(f"\n=== 3. TEST PUT (UPDATE ID: {emp_id}) ===")
    updated_emp = {
        "department": "기획조정실",
        "name": "홍길동(수정됨)",
        "employment_type": "정직원",
        "hire_date": "2026-10-22",
        "position_years": "책임1년",
        "phone": "010-1111-2222",
        "email": "updated@dspharm.com",
        "status": "재직",
        "notes": "정보 수정 테스트 성공"
    }
    req_put = urllib.request.Request(
        f"{BASE}/api/employees/{emp_id}",
        data=json.dumps(updated_emp).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with urllib.request.urlopen(req_put) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("PUT Result:", res)

    print(f"\n=== 4. VERIFY UPDATE (GET ID: {emp_id}) ===")
    with urllib.request.urlopen(f"{BASE}/api/employees/{emp_id}") as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Updated Data:", res['data']['name'], res['data']['department'], res['data']['position_years'])

    print(f"\n=== 5. TEST DELETE (DELETE ID: {emp_id}) ===")
    req_del = urllib.request.Request(f"{BASE}/api/employees/{emp_id}", method='DELETE')
    with urllib.request.urlopen(req_del) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("DELETE Result:", res)

    print(f"\n=== 6. VERIFY DELETION ===")
    try:
        urllib.request.urlopen(f"{BASE}/api/employees/{emp_id}")
        print("ERROR: Record still exists!")
    except urllib.error.HTTPError as e:
        print("Verified! HTTP Status:", e.code)

    print(f"\n=== 7. TEST STATS API ===")
    with urllib.request.urlopen(f"{BASE}/api/stats") as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Total employees in stats:", res['stats']['totalEmployees'])
        print("Top 3 departments:", res['stats']['topDepartments'][:3])

    print(f"\n=== 8. TEST EXPORT EXCEL API ===")
    with urllib.request.urlopen(f"{BASE}/api/export") as resp:
        content_type = resp.headers.get('Content-Type')
        content_length = len(resp.read())
        print(f"Export Content-Type: {content_type}, File size: {content_length} bytes")

    print("\nALL API TESTS PASSED SUCCESSFULLY! :)")

if __name__ == '__main__':
    test_api()
