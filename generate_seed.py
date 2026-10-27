import csv

def generate_inserts():
    with open('c:/Share/INSA/employees_initial.csv', mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        # Header: 근무부서,사원,사원구분,입사일,26년 연차
        
        values = []
        for row in reader:
            if not row or len(row) < 2:
                continue
            dept = row[0].strip().replace("'", "''")
            name = row[1].strip().replace("'", "''")
            emp_type = row[2].strip().replace("'", "''") if len(row) > 2 and row[2].strip() else '정직원'
            hire_date_raw = row[3].strip() if len(row) > 3 else ''
            pos_years_raw = row[4].strip() if len(row) > 4 else ''
            
            hire_date_val = f"'{hire_date_raw}'" if hire_date_raw else "NULL"
            if pos_years_raw and pos_years_raw != 'NaN':
                escaped_pos = pos_years_raw.replace("'", "''")
                pos_years_val = f"'{escaped_pos}'"
            else:
                pos_years_val = "NULL"
            
            values.append(f"('{dept}', '{name}', '{emp_type}', {hire_date_val}, {pos_years_val}, '재직')")
            
        sql = "USE insa_db;\n"
        sql += "TRUNCATE TABLE employees;\n"
        sql += "INSERT INTO employees (department, name, employment_type, hire_date, position_years, status) VALUES\n"
        sql += ",\n".join(values) + ";\n"
        
        with open('c:/Share/INSA/seed_data.sql', 'w', encoding='utf-8') as out:
            out.write(sql)
            
        print(f"Generated {len(values)} records to seed_data.sql")

if __name__ == '__main__':
    generate_inserts()
