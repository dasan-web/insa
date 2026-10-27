import subprocess

with open('c:/Share/INSA/seed_data.sql', 'rb') as f:
    sql_bytes = f.read()

cmd = [
    r"C:\Program Files\MariaDB 11.8\bin\mariadb.exe",
    "-u", "root",
    "--password=ektks0518!",
    "--default-character-set=utf8mb4"
]

res = subprocess.run(cmd, input=sql_bytes, capture_output=True)
print("Return code:", res.returncode)
if res.stderr:
    print("Stderr:", res.stderr.decode('utf-8', errors='replace'))
print("Import completed with UTF-8 binary stdin!")
