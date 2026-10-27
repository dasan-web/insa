const mysql = require('mysql2/promise');

async function syncToTiDB() {
  console.log('Connecting to Local MariaDB...');
  const localPool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'ektks0518!',
    database: 'insa_db',
    dateStrings: true
  });

  console.log('Connecting to Remote TiDB Cloud...');
  const remotePool = mysql.createPool({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '34mGcDTA8bbMoj7.root',
    password: '3h8a12Y8gOr6fbVj',
    database: 'insa_db',
    ssl: { rejectUnauthorized: false },
    dateStrings: true
  });

  try {
    // 1. Create employees table on TiDB
    console.log('Creating employees table on TiDB...');
    await remotePool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department VARCHAR(100) NOT NULL,
        name VARCHAR(50) NOT NULL,
        employment_type VARCHAR(50) NOT NULL DEFAULT '정직원',
        hire_date DATE NULL,
        position_years VARCHAR(50) NULL,
        phone VARCHAR(50) NULL,
        email VARCHAR(100) NULL,
        status VARCHAR(20) NOT NULL DEFAULT '재직',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dept (department),
        INDEX idx_name (name),
        INDEX idx_employment_type (employment_type),
        INDEX idx_status (status)
      );
    `);

    // 2. Create position_ranks table on TiDB
    console.log('Creating position_ranks table on TiDB...');
    await remotePool.query(`
      CREATE TABLE IF NOT EXISTS position_ranks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        step_order INT NOT NULL,
        rank_name VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(30) NULL,
        years INT NOT NULL DEFAULT 1,
        next_rank VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (step_order)
      );
    `);

    // 3. Sync position_ranks
    const [localRanks] = await localPool.query('SELECT * FROM position_ranks ORDER BY step_order ASC');
    console.log(`Fetched ${localRanks.length} ranks from local.`);
    await remotePool.query('TRUNCATE TABLE position_ranks;');
    for (const r of localRanks) {
      await remotePool.query(
        'INSERT INTO position_ranks (id, step_order, rank_name, category, years, next_rank) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.step_order, r.rank_name, r.category, r.years, r.next_rank]
      );
    }
    console.log('Synced position_ranks to TiDB successfully!');

    // 4. Sync employees
    const [localEmployees] = await localPool.query('SELECT * FROM employees ORDER BY id ASC');
    console.log(`Fetched ${localEmployees.length} employees from local.`);
    await remotePool.query('TRUNCATE TABLE employees;');
    for (const emp of localEmployees) {
      await remotePool.query(
        `INSERT INTO employees (id, department, name, employment_type, hire_date, position_years, phone, email, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [emp.id, emp.department, emp.name, emp.employment_type, emp.hire_date, emp.position_years, emp.phone, emp.email, emp.status, emp.notes]
      );
    }
    console.log('Synced employees to TiDB successfully!');

    const [[countRow]] = await remotePool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`Verification: TiDB employees count = ${countRow.count}`);

  } catch (err) {
    console.error('Sync Error:', err);
  } finally {
    await localPool.end();
    await remotePool.end();
  }
}

syncToTiDB();
