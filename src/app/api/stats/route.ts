import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Total counts & status
    const [statusRows] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count FROM employees GROUP BY status`
    );

    // 2. Employment type distribution
    const [typeRows] = await pool.query<RowDataPacket[]>(
      `SELECT employment_type, COUNT(*) as count FROM employees GROUP BY employment_type`
    );

    // 3. Department distribution (Top 10)
    const [deptRows] = await pool.query<RowDataPacket[]>(
      `SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC LIMIT 10`
    );

    // 4. Total employees & distinct departments
    const [overviewRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_employees, COUNT(DISTINCT department) as total_departments FROM employees`
    );

    // 5. Recent additions
    const [recentRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, department, name, employment_type, hire_date, position_years FROM employees WHERE hire_date IS NOT NULL ORDER BY hire_date DESC LIMIT 5`
    );

    const totalEmployees = Number((overviewRows[0] as { total_employees: number })?.total_employees) || 0;
    const totalDepartments = Number((overviewRows[0] as { total_departments: number })?.total_departments) || 0;

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalEmployees,
          totalDepartments,
          statusDistribution: statusRows,
          employmentTypeDistribution: typeRows,
          topDepartments: deptRows,
          recentEmployees: recentRows,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error fetching HR stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
