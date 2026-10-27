import subprocess

ranks_data = [
    # (step_order, rank_name, category, years, next_rank)
    (1, "사원1년", "사원", 1, "사원2년"),
    (2, "사원2년", "사원", 2, "사원3년"),
    (3, "사원3년", "사원", 3, "사원4년"),
    (4, "사원4년", "사원", 4, "사원5년"),
    (5, "사원5년", "사원", 5, "사원6년"),
    (6, "사원6년", "사원", 6, "사원7년"),
    (7, "사원7년", "사원", 7, "사원8년"),
    (8, "사원8년", "사원", 8, "주임1년"),
    (9, "주임1년", "주임", 1, "주임2년"),
    (10, "주임2년", "주임", 2, "선임Ⅰ1년"),
    (11, "선임Ⅰ1년", "선임Ⅰ", 1, "선임Ⅰ2년"),
    (12, "선임Ⅰ2년", "선임Ⅰ", 2, "선임Ⅰ3년"),
    (13, "선임Ⅰ3년", "선임Ⅰ", 3, "선임Ⅰ4년"),
    (14, "선임Ⅰ4년", "선임Ⅰ", 4, "선임Ⅱ1년"),
    (15, "선임Ⅱ1년", "선임Ⅱ", 1, "선임Ⅱ2년"),
    (16, "선임Ⅱ2년", "선임Ⅱ", 2, "선임Ⅱ3년"),
    (17, "선임Ⅱ3년", "선임Ⅱ", 3, "선임Ⅱ4년"),
    (18, "선임Ⅱ4년", "선임Ⅱ", 4, "선임Ⅱ5년"),
    (19, "선임Ⅱ5년", "선임Ⅱ", 5, "책임1년"),
    (20, "책임1년", "책임", 1, "책임2년"),
    (21, "책임2년", "책임", 2, "책임3년"),
    (22, "책임3년", "책임", 3, "책임4년"),
    (23, "책임4년", "책임", 4, "수석1년"),
    (24, "책임5년", "책임", 5, "수석1년"),
    (25, "책임6년", "책임", 6, "수석1년"),
    (26, "수석1년", "수석", 1, "수석2년"),
    (27, "수석2년", "수석", 2, "수석3년"),
    (28, "수석3년", "수석", 3, "수석4년"),
    (29, "수석4년", "수석", 4, "수석5년"),
    (30, "수석5년", "수석", 5, "수석6년"),
    (31, "수석6년", "수석", 6, "수석7년"),
    (32, "수석7년", "수석", 7, "이사보"),
    (33, "이사보", "임원", 1, "이사"),
    (34, "이사", "임원", 1, "이사"),
]

sql_lines = [
    "USE insa_db;",
    "CREATE TABLE IF NOT EXISTS position_ranks (",
    "  id INT AUTO_INCREMENT PRIMARY KEY,",
    "  step_order INT NOT NULL,",
    "  rank_name VARCHAR(50) NOT NULL UNIQUE,",
    "  category VARCHAR(30) NULL,",
    "  years INT NOT NULL DEFAULT 1,",
    "  next_rank VARCHAR(50) NULL,",
    "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,",
    "  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,",
    "  INDEX idx_order (step_order)",
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
    "TRUNCATE TABLE position_ranks;",
    "INSERT INTO position_ranks (step_order, rank_name, category, years, next_rank) VALUES"
]

val_lines = []
for item in ranks_data:
    order, name, cat, yr, next_r = item
    next_val = f"'{next_r}'" if next_r else "NULL"
    val_lines.append(f"({order}, '{name}', '{cat}', {yr}, {next_val})")

sql_lines.append(",\n".join(val_lines) + ";")
full_sql = "\n".join(sql_lines)

cmd = [
    r"C:\Program Files\MariaDB 11.8\bin\mariadb.exe",
    "-u", "root",
    "--password=ektks0518!",
    "--default-character-set=utf8mb4"
]

res = subprocess.run(cmd, input=full_sql.encode('utf-8'), capture_output=True)
print("Return code:", res.returncode)
if res.stderr:
    print("Stderr:", res.stderr.decode('utf-8', errors='replace'))
print("Successfully initialized position_ranks table!")
