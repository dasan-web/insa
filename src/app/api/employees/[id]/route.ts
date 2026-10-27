import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사원 ID입니다.' }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM employees WHERE id = ?',
      [numId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: '사원 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: unknown) {
    console.error('Error fetching employee detail:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사원 ID입니다.' }, { status: 400 });
    }

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

    const cleanHireDate = hire_date && hire_date.trim() ? hire_date.trim() : null;
    const cleanPositionYears = position_years && position_years.trim() ? position_years.trim() : null;
    const cleanPhone = phone && phone.trim() ? phone.trim() : null;
    const cleanEmail = email && email.trim() ? email.trim() : null;
    const cleanNotes = notes && notes.trim() ? notes.trim() : null;

    const sql = `
      UPDATE employees
      SET department = ?, name = ?, employment_type = ?, hire_date = ?, position_years = ?, phone = ?, email = ?, status = ?, notes = ?
      WHERE id = ?
    `;

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
      numId,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: '수정할 사원 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '사원 정보가 성공적으로 수정되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Error updating employee:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사원 ID입니다.' }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM employees WHERE id = ?',
      [numId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: '삭제할 사원 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '사원 정보가 성공적으로 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Error deleting employee:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
