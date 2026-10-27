import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { calculate5YearProjections, RankItem } from '@/lib/rankProjection';

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const targetYear = parseInt(body.targetYear, 10);

    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2050) {
      return NextResponse.json(
        { success: false, error: '유효한 기준 연도를 지정해주세요 (2020~2050년).' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // 1. Ensure tables exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_year_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        base_year INT NOT NULL,
        employee_id INT NOT NULL,
        position_years VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emp_yr (employee_id, base_year)
      )
    `);

    // 2. Read current base_year from DB
    const [settingRows] = await connection.query<RowDataPacket[]>(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'base_year'"
    );
    const currentBaseYear =
      settingRows.length > 0 ? parseInt(settingRows[0].setting_value, 10) : 2026;

    // 3. Read all employees and position ranks
    const [employees] = await connection.query<RowDataPacket[]>(
      'SELECT id, position_years, status FROM employees'
    );
    const [ranksRows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM position_ranks ORDER BY step_order ASC'
    );
    const ranks = ranksRows as RankItem[];

    // 4. Save snapshot of currentBaseYear if not exists
    const [historyCheck] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM employee_year_history WHERE base_year = ?',
      [currentBaseYear]
    );
    if (historyCheck[0].count === 0) {
      for (const emp of employees) {
        await connection.query(
          'INSERT INTO employee_year_history (base_year, employee_id, position_years) VALUES (?, ?, ?)',
          [currentBaseYear, emp.id, emp.position_years]
        );
      }
    }

    let updatedCount = 0;

    if (targetYear === currentBaseYear) {
      // Same year: Just confirm current base year in DB
      await connection.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('base_year', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [targetYear.toString(), targetYear.toString()]
      );
      updatedCount = employees.length;
    } else if (targetYear < currentBaseYear) {
      // Target year is earlier: check if we have history snapshot
      const [pastHistory] = await connection.query<RowDataPacket[]>(
        'SELECT employee_id, position_years FROM employee_year_history WHERE base_year = ?',
        [targetYear]
      );

      if (pastHistory.length > 0) {
        const historyMap = new Map<number, string>();
        for (const h of pastHistory) {
          historyMap.set(h.employee_id, h.position_years);
        }
        for (const emp of employees) {
          if (historyMap.has(emp.id)) {
            const restoredRank = historyMap.get(emp.id);
            await connection.query('UPDATE employees SET position_years = ? WHERE id = ?', [
              restoredRank,
              emp.id,
            ]);
            updatedCount++;
          }
        }
      } else {
        // No past snapshot, retain current
        updatedCount = employees.length;
      }

      await connection.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('base_year', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [targetYear.toString(), targetYear.toString()]
      );
    } else {
      // Target year is in the future: advance ranks according to position progression
      const yearDiff = targetYear - currentBaseYear;

      for (const emp of employees) {
        if (emp.status === '퇴사') continue;
        const proj = calculate5YearProjections(
          emp.position_years,
          ranks,
          currentBaseYear + yearDiff
        );
        const newRank = proj.baseRank;
        await connection.query('UPDATE employees SET position_years = ? WHERE id = ?', [
          newRank,
          emp.id,
        ]);
        updatedCount++;
      }

      // Record snapshot of targetYear
      for (const emp of employees) {
        const [currRow] = await connection.query<RowDataPacket[]>(
          'SELECT position_years FROM employees WHERE id = ?',
          [emp.id]
        );
        const savedRank = currRow[0]?.position_years || emp.position_years;
        await connection.query(
          'INSERT INTO employee_year_history (base_year, employee_id, position_years) VALUES (?, ?, ?)',
          [targetYear, emp.id, savedRank]
        );
      }

      await connection.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('base_year', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [targetYear.toString(), targetYear.toString()]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `${targetYear}년 기준 연도 및 사원 직급 데이터가 DB에 확정 저장되었습니다.`,
      base_year: targetYear,
      updatedCount,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error confirming base year in DB:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'DB 확정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
