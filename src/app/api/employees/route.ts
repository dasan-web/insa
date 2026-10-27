import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const employment_type = searchParams.get('employment_type') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = searchParams.get('limit') || '20';
    const isAll = limitParam === 'all' || limitParam === '0';
    const limit = Math.max(1, parseInt(limitParam, 10) || 20);
    const offset = (page - 1) * limit;

    // Allowed sort columns
    const allowedSortColumns: Record<string, string> = {
      id: 'id',
      department: 'department',
      name: 'name',
      employment_type: 'employment_type',
      hire_date: 'hire_date',
      position_years: 'position_years',
      status: 'status',
      created_at: 'created_at',
    };
    const orderColumn = allowedSortColumns[sortBy] || 'id';

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search.trim()) {
      conditions.push('(name LIKE ? OR department LIKE ? OR position_years LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const wild = `%${search.trim()}%`;
      params.push(wild, wild, wild, wild, wild);
    }

    if (department && department !== '전체') {
      conditions.push('department = ?');
      params.push(department);
    }

    if (employment_type && employment_type !== '전체') {
      conditions.push('employment_type = ?');
      params.push(employment_type);
    }

    if (status && status !== '전체') {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) as total FROM employees ${whereClause}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = (countRows[0] as { total: number })?.total || 0;

    // Data query
    let dataSql = `SELECT * FROM employees ${whereClause} ORDER BY ${orderColumn} ${sortOrder}`;
    const dataParams = [...params];

    if (!isAll) {
      dataSql += ` LIMIT ? OFFSET ?`;
      dataParams.push(limit, offset);
    }

    const [rows] = await pool.query<RowDataPacket[]>(dataSql, dataParams);

    // Get unique departments & employment types for filtering
    const [deptRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department ASC`
    );
    const departments = deptRows.map((r) => r.department);

    const [typeRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT employment_type FROM employees WHERE employment_type IS NOT NULL AND employment_type != '' ORDER BY employment_type ASC`
    );
    const employmentTypes = typeRows.map((r) => r.employment_type);

    // Overall stats for instant KPI sync
    const [overviewRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_employees, COUNT(DISTINCT department) as total_departments FROM employees`
    );
    const [typeDistRows] = await pool.query<RowDataPacket[]>(
      `SELECT employment_type, COUNT(*) as count FROM employees GROUP BY employment_type`
    );

    const totalEmployees = Number((overviewRows[0] as { total_employees: number })?.total_employees) || total;
    const totalDepartments = Number((overviewRows[0] as { total_departments: number })?.total_departments) || departments.length;

    return NextResponse.json(
      {
        success: true,
        data: rows,
        pagination: {
          total,
          page,
          limit: isAll ? total : limit,
          totalPages: isAll ? 1 : Math.ceil(total / limit) || 1,
        },
        departments,
        employmentTypes,
        stats: {
          totalEmployees,
          totalDepartments,
          employmentTypeDistribution: typeDistRows,
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
    console.error('Error fetching employees:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      department,
      name,
      employment_type = '정직원',
      hire_date = null,
      position_years = null,
      phone = null,
      email = null,
      status = '재직',
      notes = null,
    } = body;

    if (!department || !name) {
      return NextResponse.json(
        { success: false, error: '근무부서와 사원 성명은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO employees (department, name, employment_type, hire_date, position_years, phone, email, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const cleanHireDate = hire_date && hire_date.trim() ? hire_date.trim() : null;
    const cleanPositionYears = position_years && position_years.trim() ? position_years.trim() : null;
    const cleanPhone = phone && phone.trim() ? phone.trim() : null;
    const cleanEmail = email && email.trim() ? email.trim() : null;
    const cleanNotes = notes && notes.trim() ? notes.trim() : null;

    const [result] = await pool.query<ResultSetHeader>(sql, [
      department.trim(),
      name.trim(),
      employment_type.trim(),
      cleanHireDate,
      cleanPositionYears,
      cleanPhone,
      cleanEmail,
      status.trim(),
      cleanNotes,
    ]);

    return NextResponse.json({
      success: true,
      message: '사원 정보가 성공적으로 등록되었습니다.',
      insertId: result.insertId,
    });
  } catch (error: unknown) {
    console.error('Error creating employee:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
